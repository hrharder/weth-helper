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
    private readonly _provider: SupportedProvider;
    private readonly _init: Promise<void>;
    private readonly _web3: Web3Wrapper;
    private readonly _txDefaults: Partial<TxData>;

    private _weth: WETH9Contract;
    private _erc20: ERC20Token;

    /** The users 0-index address (used if not overridden with TxData) */
    public coinbase: string;

    /** Ethereum network ID of the detected network. */
    public networkId: number;

    /** Token address of the canonical WETH contract for the configured network. */
    public wethAddress: string;

    /** Set to `true` after initialization completes. */
    public ready: boolean;

    /**
     * Create a new WethHelper instance with a configured provider and optional
     * transaction defaults.
     *
     * @param provider A configured Ethereum JSONRPC provider instance.
     * @param txDefaults Optional defaults to use for all transactions.
     */
    constructor(provider: SupportedProvider, txDefaults: Partial<TxData> = {}) {
        providerUtils.standardizeOrThrow(provider);

        this.ready = false;
        this._provider = provider;
        this._txDefaults = txDefaults;

        this._web3 = new Web3Wrapper(this._provider, this._txDefaults);
        this._init = this._initialize();
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
     * @returns The submitted transaction hash (ID).
     */
    public async wrap(amount: BigNumber, txDefaults?: Partial<TxData>): Promise<string> {
        await this._init;
        assert.isBigNumber("amount", amount);
        assert.isValidBaseUnitAmount("amount", amount);

        const options = txDefaults || this._txDefaults;
        try {
            return this._weth.deposit.validateAndSendTransactionAsync({ value: amount, ...options });
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
     * @returns The submitted transaction hash (ID).
     */
    public async unwrap(amount: BigNumber, txDefaults?: Partial<TxData>): Promise<string> {
        await this._init;
        assert.isBigNumber("amount", amount);
        assert.isValidBaseUnitAmount("amount", amount);

        const options = txDefaults || this._txDefaults;
        try {
            return this._weth.withdraw.validateAndSendTransactionAsync(amount, options);
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
     * @returns The user's ETH balance in base units (wei) as a `BigNumber`.
     */
    public async getEtherBalance(address?: string): Promise<BigNumber> {
        await this._init;
        try {
            return this._web3.getBalanceInWeiAsync(address || this.coinbase);
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
     * @returns The user's WETH balance in base units (wei) as a `BigNumber`.
     */
    public async getWethBalance(address?: string): Promise<BigNumber> {
        await this._init;
        try {
            return this._erc20.getBalanceAsync(this.wethAddress, address || this.coinbase);
        } catch (error) {
            throw new Error(`[weth-helper] failed to get WETH balance: ${error.message}`);
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
     * @returns The submitted transaction hash (ID).
     */
    public async setProxyAllowance(amount: BigNumber, txDefaults?: Partial<TxData>): Promise<string> {
        await this._init;
        assert.isBigNumber("amount", amount);
        assert.isValidBaseUnitAmount("amount", amount);

        const options = txDefaults || this._txDefaults;
        try {
            return this._erc20.setProxyAllowanceAsync(this.wethAddress, amount, options);
        } catch (error) {
            throw new Error(`[weth-helper] failed to set ERC-20 proxy allowance for WETH: ${error.message}`);
        }
    }

    /**
     * Set an "unlimited" (maximum `unit256`) ERC-20 proxy allowance for WETH for
     * trading within the 0x ecosystem.
     *
     * @param txDefaults Optional transaction data: gas limit, gas price, and from address.
     * @returns The submitted transaction hash (ID).
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
     */
    public fromBaseUnits(value: number | string | BigNumber, decimals: number = 18): BigNumber {
        const bn = new BigNumber(value);
        assert.isValidBaseUnitAmount("value", bn);
        return Web3Wrapper.toUnitAmount(bn, decimals);
    }

    private async _initialize(): Promise<void> {
        try {
            this.networkId = await this._web3.getNetworkIdAsync();
            const { etherToken } = getContractAddressesForNetworkOrThrow(this.networkId);
            this.wethAddress = etherToken;

            // update txDefaults to use coinbase if 'from' was not provided by user
            const addresses = await this._web3.getAvailableAddressesAsync();
            this.coinbase = addresses.length > 0 ? addresses[0] : null;
            this._txDefaults.from = this._txDefaults.from ? this._txDefaults.from : this.coinbase;

            this._weth = new WETH9Contract(this.wethAddress, this._provider, this._txDefaults);
            this._erc20 = new ERC20Token(this._provider, this._txDefaults);

            this.ready = true;
        } catch (error) {
            throw new Error(`[weth-helper] failed to initialize: ${error.message}`);
        }
    }
}
