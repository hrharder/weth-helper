import { WETH9Contract } from "@0x/abi-gen-wrappers";
import { assert } from "@0x/assert";
import { getContractAddressesForNetworkOrThrow } from "@0x/contract-addresses";
import { BigNumber, providerUtils } from "@0x/utils";
import { Web3Wrapper } from "@0x/web3-wrapper";
import { ERC20Token } from "@habsyr/erc20-token";
import { SupportedProvider, TxData } from "ethereum-types";

/**
 * WethHelper (Wrapper Ether helper) is a class that abstracts the process of
 * wrapping and unwrapping Ether using the canonical WETH (WETH9) contract.
 *
 * It also provides methods for checking balances (ETH and WETH) and setting
 * proxy allowances for interacting with the 0x contract system.
 *
 * All numerical values are expected as `BigNumbers`, and all units for balances
 * and allowances are returned as, and expected in base units (wei).
 *
 * Methods are provided to convert between base units (wei) and ether.
 */
export class WethHelper {
    private readonly _provider: SupportedProvider;  // JSONRPC provider
    private readonly _init: Promise<void>;          // initialization promise
    private readonly _web3: Web3Wrapper;            // Ethereum web3 wrapper
    private readonly _txDefaults: Partial<TxData>;  // write (transaction) defaults

    private _weth: WETH9Contract;   // initialized wrapped-ether contract wrapper
    private _erc20: ERC20Token;     // initialized ERC-20 token abstraction
    private _coinbase: string;      // user's 0-index address
    private _networkId: number;     // detected Ethereum network ID (from provider)
    private _wethAddress: string;   // address of wETH contract for detected network

    /**
     * Create a new WethHelper instance with a configured provider and optional
     * transaction defaults.
     *
     * @param provider A configured Ethereum JSONRPC provider instance.
     * @param txDefaults Optional defaults to use for all transactions.
     */
    constructor(provider: SupportedProvider, txDefaults: Partial<TxData> = {}) {
        providerUtils.standardizeOrThrow(provider);

        this._provider = provider;
        this._txDefaults = txDefaults;

        this._web3 = new Web3Wrapper(this._provider, this._txDefaults);
        this._init = this._initialize();
    }

    /**
     * Get the user's 0-index address (used if not overridden with TxData) for
     * transaction calls.
     *
     * In web3 browsers, the coinbase is the configured address.
     *
     * @returns A promise that resolves to the user's coinbase address.
     */
    public async getCoinbase(): Promise<string> {
        await this._init;
        return this._coinbase;
    }

    /**
     * Get the detected Ethereum network ID (1 for mainnet, 3 for ropsten, etc.)
     *
     * @returns A promise that resolves to the network ID as a number.
     */
    public async getNetworkId(): Promise<number> {
        await this._init;
        return this._networkId;
    }

    /**
     * Fetch the address for the canonical wrapped ether (wETH) contract for the
     * detected Ethereum network.
     *
     * @returns A promise that resolves to the wETH token address.
     */
    public async getWethAddress(): Promise<string> {
        await this._init;
        return this._wethAddress;
    }

    /**
     * Generate WETH by "wrapping" Ether: submitting it to the WETH contract using
     * the deposit method.
     *
     * Will send the transaction from the configured/detected `coinbase` address
     * unless overridden with `txDefaults` (second parameter).
     *
     * @param amount The amount of Ether to wrap in base units (wei).
     * @param txDefaults Optional transaction data: gas limit, gas price, and from address.
     * @returns A promise that resolves to the submitted transaction hash (ID).
     */
    public async wrap(amount: BigNumber, txDefaults?: Partial<TxData>): Promise<string> {
        assert.isBigNumber("amount", amount);
        assert.isValidBaseUnitAmount("amount", amount);

        const weth = await this._getWethContract();
        const options = txDefaults || this._txDefaults;

        try {
            return weth.deposit.validateAndSendTransactionAsync({ value: amount, ...options });
        } catch (error) {
            throw new Error(`[weth-helper] failed to wrap ether: ${error.message}`);
        }
    }

    /**
     * Generate ETH by "un-wrapping" WETH: submitting a transaction to request a
     * withdrawal from the WETH contract.
     *
     * Will send the transaction from the configured/detected `coinbase` address
     * unless overridden with `txDefaults` (second parameter).
     *
     * @param amount The amount of Ether to un-wrap in base units (wei).
     * @param txDefaults Optional transaction data: gas limit, gas price, and from address.
     * @returns A promise that resolves to the submitted transaction hash (ID).
     */
    public async unwrap(amount: BigNumber, txDefaults?: Partial<TxData>): Promise<string> {
        assert.isBigNumber("amount", amount);
        assert.isValidBaseUnitAmount("amount", amount);

        const weth = await this._getWethContract();
        const options = txDefaults || this._txDefaults;

        try {
            return weth.withdraw.validateAndSendTransactionAsync(amount, options);
        } catch (error) {
            throw new Error(`[weth-helper] failed to wrap ether: ${error.message}`);
        }
    }

    /**
     * Fetch the Ether balance of an account (in base units).
     *
     * If no `address` parameter is defined, the detected coinbase is used.
     *
     * @param address A user's Ethereum address to check the balance for.
     * @returns A promise that resolves to the user's ETH balance in base units (wei) as a `BigNumber`.
     */
    public async getEtherBalance(address?: string): Promise<BigNumber> {
        if (address) {
            assert.isETHAddressHex("address", address);
        }

        const web3 = await this._getWeb3Wrapper();
        const owner = address || await this.getCoinbase();

        try {
            return web3.getBalanceInWeiAsync(owner);
        } catch (error) {
            throw new Error(`[weth-helper] failed to get ether balance: ${error.message}`);
        }
    }

    /**
     * Fetch the wrapped-Ether (WETH) balance of an account (in base units).
     *
     * If no `address` parameter is defined, the detected coinbase is used.
     *
     * @param address A user's Ethereum address to check the balance for.
     * @returns A promise that resolves to the user's WETH balance in base units (wei) as a `BigNumber`.
     */
    public async getWethBalance(address?: string): Promise<BigNumber> {
        if (address) {
            assert.isETHAddressHex("address", address);
        }

        const wethAddress = await this.getWethAddress();
        const erc20 = await this._getTokenWrapper();
        const owner = address || await this.getCoinbase();

        try {
            return erc20.getBalanceAsync(wethAddress, owner);
        } catch (error) {
            throw new Error(`[weth-helper] failed to get WETH balance: ${error.message}`);
        }
    }

    /**
     * Get the current 0x ERC-20 asset proxy allowance for the wrapped ether token
     * for the detected network (returns a `BigNumber` value in base units).
     *
     * @param owner The address to check WETH proxy allowance for (defaults to coinbase).
     * @returns A promise that resolves to a BigNumber representing the current WETH asset proxy allowance.
     */
    public async getProxyAllowance(owner?: string): Promise<BigNumber> {
        if (owner) {
            assert.isETHAddressHex("owner", owner);
        }

        const wethAddress = await this.getWethAddress();
        const erc20 = await this._getTokenWrapper();
        const address = owner || await this.getCoinbase();

        try {
            return erc20.getProxyAllowanceAsync(wethAddress, address);
        } catch (error) {
            throw new Error(`[weth-helper] failed to get ERC-20 proxy allowance for WETH: ${error.message}`);
        }
    }

    /**
     * Set an arbitrary spender allowance value for the 0x ERC-20 proxy contract
     * for the wrapped-ether (WETH) token for trading in the 0x ecosystem.
     *
     * If a specific allowance is not needed, it is recommended to instead set
     * an "unlimited" allowance which will decrease the cost of trading.
     *
     * @param amount The amount of tokens to allow the proxy contract to spend (in base units).
     * @param txDefaults Optional transaction data: gas limit, gas price, and from address.
     * @returns A promise that resolves to the submitted transaction hash (ID).
     */
    public async setProxyAllowance(amount: BigNumber, txDefaults?: Partial<TxData>): Promise<string> {
        assert.isBigNumber("amount", amount);
        assert.isValidBaseUnitAmount("amount", amount);

        const wethAddress = await this.getWethAddress();
        const erc20 = await this._getTokenWrapper();
        const options = txDefaults || this._txDefaults;

        try {
            return erc20.setProxyAllowanceAsync(wethAddress, amount, options);
        } catch (error) {
            throw new Error(`[weth-helper] failed to set ERC-20 proxy allowance for WETH: ${error.message}`);
        }
    }

    /**
     * Set an "unlimited" (maximum `unit256`) ERC-20 proxy allowance for WETH for
     * trading within the 0x ecosystem.
     *
     * @param txDefaults Optional transaction data: gas limit, gas price, and from address.
     * @returns A promise that resolves to the submitted transaction hash (ID).
     */
    public async setUnlimitedProxyAllowance(txDefaults?: Partial<TxData>): Promise<string> {
        return this.setProxyAllowance(ERC20Token.UNLIMITED_ALLOWANCE, txDefaults);
    }

    /**
     * Convert a "unit" value (user representation) to base-unit (wei) representation
     * used in contract logic.
     *
     * @param value The value (as a number, string, or BigNumber) to convert.
     * @param decimals Optionally specify the number of decimals in a unit (default: 18).
     * @returns A BigNumber representing the value converted to "base" units.
     */
    public toBaseUnits(value: number | string | BigNumber, decimals: number = 18): BigNumber {
        const bn = new BigNumber(value);
        if (bn.isNaN() || bn.isNegative()) {
            throw new Error(`[weth-helper] invalid base unit value (must be positive and numerical)`);
        }
        return Web3Wrapper.toBaseUnitAmount(bn, decimals);
    }

    /**
     * Convert a "base-unit" value (accurate representation) to "unit" (user)
     * representation used to display values to users.
     *
     * @param value The value (as a number, string, or BigNumber) to convert.
     * @param decimals Optionally specify the number of decimals in a unit (default: 18).
     * @returns A BigNumber representing the value converted to "full" units.
     */
    public fromBaseUnits(value: number | string | BigNumber, decimals: number = 18): BigNumber {
        const bn = new BigNumber(value);
        assert.isValidBaseUnitAmount("value", bn);
        return Web3Wrapper.toUnitAmount(bn, decimals);
    }

    /**
     * Asynchronously fetch the initialized Ethereum JSONRPC (web3) abstraction.
     */
    private async _getWeb3Wrapper(): Promise<Web3Wrapper> {
        await this._init;
        return this._web3;
    }

    /**
     * Asynchronously fetch the initialized WETH9 contract wrapper.
     */
    private async _getWethContract(): Promise<WETH9Contract> {
        await this._init;
        return this._weth;
    }

    /**
     * Asynchronously fetch the initialized ERC-20 abstraction.
     */
    private async _getTokenWrapper(): Promise<ERC20Token> {
        await this._init;
        return this._erc20;
    }

    /**
     * Asynchronously initialize Ethereum artifacts.
     */
    private async _initialize(): Promise<void> {
        try {
            this._networkId = await this._web3.getNetworkIdAsync();
            const { etherToken } = getContractAddressesForNetworkOrThrow(this._networkId);
            this._wethAddress = etherToken;

            // update txDefaults to use coinbase if 'from' was not provided by user
            const addresses = await this._web3.getAvailableAddressesAsync();
            this._coinbase = addresses.length > 0 ? addresses[0] : null;
            this._txDefaults.from = this._txDefaults.from ? this._txDefaults.from : this._coinbase;

            this._weth = new WETH9Contract(this._wethAddress, this._provider, this._txDefaults);
            this._erc20 = new ERC20Token(this._provider, this._txDefaults);
        } catch (error) {
            throw new Error(`[weth-helper] failed to initialize: ${error.message}`);
        }
    }
}
