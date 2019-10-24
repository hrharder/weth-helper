import { getContractAddressesForNetworkOrThrow } from "@0x/contract-addresses";
import { ERC20Token, MAX_ALLOWANCE } from "@habsyr/erc20-token";
import assert from "assert";
import Web3 from "web3";

import { BigNumber, Web3Wrapper, WethHelper } from "../";

const {
    ETHEREUM_JSONRPC_URL = "http://localhost:8545",
} = process.env;

describe("WethHelper test suite", function (): void {
    // test values
    const NEGATIVE_ONE = new BigNumber(-1);
    const ZERO = new BigNumber(0);
    const ONE = new BigNumber(1);
    const MAX_UINT256 = new BigNumber(2).exponentiatedBy(256).minus(1);
    const MAX_UINT256_PLUS_ONE = new BigNumber(MAX_UINT256).plus(1);

    describe("instance method tests", function (): void {
        let wethHelper: WethHelper;

        const web3 = new Web3Wrapper(new Web3(ETHEREUM_JSONRPC_URL).currentProvider as any);
        const erc20 = new ERC20Token(web3.getProvider());

        describe("#constructor", () => {
            it("should synchronously call the constructor without error", () => {
                wethHelper = new WethHelper(web3.getProvider());
            });
            it("should complete asynchronous initialization without error", async () => {
                await (wethHelper as any)._init;
                assert.strictEqual(wethHelper.ready, true, "wethHelper should be ready");
            });
        });

        describe("#wrap", () => {
            it("should reject if a negative value is passed as amount", async () => {
                const fn = async () => wethHelper.wrap(NEGATIVE_ONE);
                await assert.rejects(fn());
            });
            it("should reject if value that is too large is used", async () => {
                const fn = async () => wethHelper.wrap(MAX_UINT256_PLUS_ONE);
                await assert.rejects(fn());
            });
            it("should wrap 1 ETH where ETH and WETH balances change correctly", async () => {
                const account = (await web3.getAvailableAddressesAsync())[0];
                const etherBalanceBefore = await web3.getBalanceInWeiAsync(account);
                const wethBalanceBefore = await wethHelper.getWethBalance(account);

                const one = wethHelper.toBaseUnits(ONE);
                const txId = await wethHelper.wrap(one);

                await web3.awaitTransactionSuccessAsync(txId);
                const wethBalanceAfter = await wethHelper.getWethBalance(account);
                const etherBalanceAfter = await web3.getBalanceInWeiAsync(account);

                assert(wethBalanceAfter.isEqualTo(wethBalanceBefore.plus(one)), "weth balance should be exactly one greater than before");
                assert(etherBalanceAfter.isLessThan(etherBalanceBefore.minus(one)), "eth balance after should be less than eth balance before minus one");
            });
        });

        describe("#unwrap", () => {
            it("should reject if a negative value is passed as amount", async () => {
                const fn = async () => wethHelper.unwrap(NEGATIVE_ONE);
                await assert.rejects(fn());
            });
            it("should reject if value that is too large is used", async () => {
                const fn = async () => wethHelper.unwrap(MAX_UINT256_PLUS_ONE);
                await assert.rejects(fn());
            });
            it("should unwrap 1 WETH where ETH and WETH balances change correctly", async () => {
                const account = (await web3.getAvailableAddressesAsync())[0];
                const etherBalanceBefore = await web3.getBalanceInWeiAsync(account);
                const wethBalanceBefore = await wethHelper.getWethBalance(account);

                const one = wethHelper.toBaseUnits(ONE);

                // hack: ganache requires more gas to unwrap than normal networks
                const txId = await wethHelper.unwrap(one, { gas: 100000 });

                await web3.awaitTransactionSuccessAsync(txId);
                const wethBalanceAfter = await wethHelper.getWethBalance(account);
                const etherBalanceAfter = await web3.getBalanceInWeiAsync(account);

                assert(wethBalanceAfter.isEqualTo(wethBalanceBefore.minus(one)), "weth balance should be exactly one less than before");
                assert(etherBalanceAfter.isLessThan(etherBalanceBefore.plus(one)), "eth balance after should be less one plus eth balance before");
            });
        });

        describe("#getEtherBalance", () => {
            it("should match the value from web3 for coinbase address", async () => {
                const account = (await web3.getAvailableAddressesAsync())[0];
                const balanceFromWeb3 = await web3.getBalanceInWeiAsync(account);
                const balanceFromHelper = await wethHelper.getEtherBalance();
                assert(balanceFromHelper.isEqualTo(balanceFromWeb3), "balances should match");
            });
            it("should match the value from web3 for arbitrary address", async () => {
                const account = (await web3.getAvailableAddressesAsync())[1];
                const balanceFromWeb3 = await web3.getBalanceInWeiAsync(account);
                const balanceFromHelper = await wethHelper.getEtherBalance(account);
                assert(balanceFromHelper.isEqualTo(balanceFromWeb3), "balances should match");
            });
        });

        describe("#getWethBalance", () => {
            it("should match the value from weth9 for coinbase address", async () => {
                const account = (await web3.getAvailableAddressesAsync())[0];
                const wethAddress = await getContractAddressesForNetworkOrThrow(await web3.getNetworkIdAsync()).etherToken;
                const balance = await erc20.getBalanceAsync(wethAddress, account);
                const balanceFromHelper = await wethHelper.getWethBalance();
                assert(balanceFromHelper.isEqualTo(balance), "balances should match");
            });
            it("should match the value from weth9 for coinbase address", async () => {
                const account = (await web3.getAvailableAddressesAsync())[1];
                const wethAddress = await getContractAddressesForNetworkOrThrow(await web3.getNetworkIdAsync()).etherToken;
                const balance = await erc20.getBalanceAsync(wethAddress, account);
                const balanceFromHelper = await wethHelper.getWethBalance(account);
                assert(balanceFromHelper.isEqualTo(balance), "balances should match");
            });
        });

        describe("#setProxyAllowance", async () => {
            const { erc20Proxy, etherToken } = await getContractAddressesForNetworkOrThrow(await web3.getNetworkIdAsync());

            it("should set an arbitrary asset proxy value correctly", async () => {
                const address = await web3.getAvailableAddressesAsync()[2];
                const allowanceBefore = await erc20.getAllowanceAsync(etherToken, address, erc20Proxy);
                assert(allowanceBefore.isEqualTo(ZERO), "should have no allowance set yet");
                await assert.doesNotReject(wethHelper.setProxyAllowance(ONE));
                const allowanceAfter = await erc20.getAllowanceAsync(etherToken, address, erc20Proxy);
                assert(allowanceAfter.isEqualTo(ONE), "should have allowance set correctly");
            });
        });

        describe("#setUnlimitedProxyAllowance", async () => {
            const { erc20Proxy, etherToken } = await getContractAddressesForNetworkOrThrow(await web3.getNetworkIdAsync());

            it("should set an unlimited asset proxy value correctly", async () => {
                const address = await web3.getAvailableAddressesAsync()[3];
                const allowanceBefore = await erc20.getAllowanceAsync(etherToken, address, erc20Proxy);
                assert(allowanceBefore.isEqualTo(ZERO), "should have no allowance set yet");
                await assert.doesNotReject(wethHelper.setUnlimitedProxyAllowance());
                const allowanceAfter = await erc20.getAllowanceAsync(etherToken, address, erc20Proxy);
                assert(allowanceAfter.isEqualTo(MAX_UINT256), "should have max allowance set");
            });
        });

        describe("#toBaseUnits", () => {
            it("should correctly convert arbitrary values to base units", () => {
                const unitValue = new BigNumber(123876);
                const expected = new BigNumber(unitValue).times("1e18");
                const actual = wethHelper.toBaseUnits(unitValue);
                assert(expected.isEqualTo(actual), "converted base unit values should match");
            });
            it("should throw for negative values", () => {
                assert.throws(() => wethHelper.toBaseUnits(NEGATIVE_ONE));
            });
            it("should throw for non-numerical values", () => {
                assert.throws(() => wethHelper.toBaseUnits("foo"));
            });
        });

        describe("#fromBaseUnits", () => {
            it("should correctly convert arbitrary values to base units", () => {
                const unitValue = new BigNumber(123876);
                const baseUnitValue = new BigNumber(unitValue).times("1e18");
                const actual = wethHelper.fromBaseUnits(baseUnitValue);
                assert(actual.isEqualTo(unitValue), "converted unit values should match");
            });
            it("should throw for values that are too large", () => {
                assert.throws(() => wethHelper.toBaseUnits(NEGATIVE_ONE));
            });
            it("should throw for negative values", () => {
                assert.throws(() => wethHelper.toBaseUnits(NEGATIVE_ONE));
            });
            it("should throw for non-numerical values", () => {
                assert.throws(() => wethHelper.toBaseUnits("foo"));
            });
        });
    });

    describe("instance property tests", function (): void {
        const web3 = new Web3Wrapper(new Web3(ETHEREUM_JSONRPC_URL).currentProvider as any);
        const wethHelper = new WethHelper(web3.getProvider());

        it("#WethHelper.prototype.coinbase", async () => {
            await (wethHelper as any)._init;
            const coinbase = (await web3.getAvailableAddressesAsync())[0];
            assert.strictEqual(wethHelper.coinbase.toLowerCase(), coinbase.toLowerCase(), "coinbases should match");
        });

        it("#WethHelper.prototype.networkId", async () => {
            await (wethHelper as any)._init;
            const networkId = await web3.getNetworkIdAsync();
            assert.strictEqual(wethHelper.networkId, networkId, "network IDs should match");
        });
        it("#WethHelper.prototype.wethAddress", async () => {
            await (wethHelper as any)._init;
            const wethAddress = await getContractAddressesForNetworkOrThrow(await web3.getNetworkIdAsync()).etherToken;
            assert.strictEqual(wethHelper.wethAddress.toLowerCase(), wethAddress.toLowerCase(), "wrapped ether addresses should match");
        });
    });
});
