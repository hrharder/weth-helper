[Wrapped Ether Helper](../README.md) › [Globals](../globals.md) › [WethHelper](wethhelper.md)

# Class: WethHelper

WethHelper (Wrapper Ether helper) is a class that abstracts the process of
wrapping and unwrapping Ether using the canonical WETH (WETH9) contract.

It also provides methods for checking balances (ETH and WETH) and setting
proxy allowances for interacting with the 0x contract system.

All numerical values are expected as `BigNumbers`, and all units for balances
and allowances are returned as, and expected in base units (wei).

Methods are provided to convert between base units (wei) and ether.

## Hierarchy

* **WethHelper**

## Index

### Constructors

* [constructor](wethhelper.md#constructor)

### Properties

* [coinbase](wethhelper.md#coinbase)
* [networkId](wethhelper.md#networkid)
* [ready](wethhelper.md#ready)
* [wethAddress](wethhelper.md#wethaddress)

### Methods

* [fromBaseUnits](wethhelper.md#frombaseunits)
* [getEtherBalance](wethhelper.md#getetherbalance)
* [getProxyAllowance](wethhelper.md#getproxyallowance)
* [getWethBalance](wethhelper.md#getwethbalance)
* [setProxyAllowance](wethhelper.md#setproxyallowance)
* [setUnlimitedProxyAllowance](wethhelper.md#setunlimitedproxyallowance)
* [toBaseUnits](wethhelper.md#tobaseunits)
* [unwrap](wethhelper.md#unwrap)
* [wrap](wethhelper.md#wrap)

## Constructors

###  constructor

\+ **new WethHelper**(`provider`: SupportedProvider, `txDefaults`: Partial‹TxData›): *[WethHelper](wethhelper.md)*

*Defined in [weth_helper.ts:40](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L40)*

Create a new WethHelper instance with a configured provider and optional
transaction defaults.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`provider` | SupportedProvider | - | A configured Ethereum JSONRPC provider instance. |
`txDefaults` | Partial‹TxData› |  {} | Optional defaults to use for all transactions.  |

**Returns:** *[WethHelper](wethhelper.md)*

## Properties

###  coinbase

• **coinbase**: *string*

*Defined in [weth_helper.ts:31](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L31)*

The users 0-index address (used if not overridden with TxData)

___

###  networkId

• **networkId**: *number*

*Defined in [weth_helper.ts:34](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L34)*

Ethereum network ID of the detected network.

___

###  ready

• **ready**: *boolean*

*Defined in [weth_helper.ts:40](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L40)*

Set to `true` after initialization completes.

___

###  wethAddress

• **wethAddress**: *string*

*Defined in [weth_helper.ts:37](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L37)*

Token address of the canonical WETH contract for the configured network.

## Methods

###  fromBaseUnits

▸ **fromBaseUnits**(`value`: number | string | BigNumber, `decimals`: number): *BigNumber*

*Defined in [weth_helper.ts:219](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L219)*

Convert a "base-unit" value (accurate representation) to "unit" (user)
representation used to display values to users.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`value` | number &#124; string &#124; BigNumber | - | The value (as a number, string, or BigNumber) to convert. |
`decimals` | number | 18 | Optionally specify the number of decimals in a unit (default: 18).  |

**Returns:** *BigNumber*

___

###  getEtherBalance

▸ **getEtherBalance**(`address?`: string): *Promise‹BigNumber›*

*Defined in [weth_helper.ts:116](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L116)*

Fetch the Ether balance of an account (in base units).

If no `address` parameter is defined, the detected coinbase is used.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`address?` | string | A user's Ethereum address to check the balance for. |

**Returns:** *Promise‹BigNumber›*

The user's ETH balance in base units (wei) as a `BigNumber`.

___

###  getProxyAllowance

▸ **getProxyAllowance**(`owner?`: string): *Promise‹BigNumber›*

*Defined in [weth_helper.ts:149](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L149)*

Get the current 0x ERC-20 asset proxy allowance for the wrapped ether token
for the detected network (returns a `BigNumber` value in base units).

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`owner?` | string | The address to check WETH proxy allowance for (defaults to coinbase). |

**Returns:** *Promise‹BigNumber›*

A BigNumber representing the current WETH asset proxy allowance.

___

###  getWethBalance

▸ **getWethBalance**(`address?`: string): *Promise‹BigNumber›*

*Defined in [weth_helper.ts:133](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L133)*

Fetch the wrapped-Ether (WETH) balance of an account (in base units).

If no `address` parameter is defined, the detected coinbase is used.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`address?` | string | A user's Ethereum address to check the balance for. |

**Returns:** *Promise‹BigNumber›*

The user's WETH balance in base units (wei) as a `BigNumber`.

___

###  setProxyAllowance

▸ **setProxyAllowance**(`amount`: BigNumber, `txDefaults?`: Partial‹TxData›): *Promise‹string›*

*Defined in [weth_helper.ts:173](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L173)*

Set an arbitrary spender allowance value for the 0x ERC-20 proxy contract
for the wrapped-ether (WETH) token for trading in the 0x ecosystem.

If a specific allowance is not needed, it is recommended to instead set
an "unlimited" allowance which will decrease the cost of trading.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`amount` | BigNumber | The amount of tokens to allow the proxy contract to spend (in base units). |
`txDefaults?` | Partial‹TxData› | Optional transaction data: gas limit, gas price, and from address. |

**Returns:** *Promise‹string›*

The submitted transaction hash (ID).

___

###  setUnlimitedProxyAllowance

▸ **setUnlimitedProxyAllowance**(`txDefaults?`: Partial‹TxData›): *Promise‹string›*

*Defined in [weth_helper.ts:193](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L193)*

Set an "unlimited" (maximum `unit256`) ERC-20 proxy allowance for WETH for
trading within the 0x ecosystem.

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`txDefaults?` | Partial‹TxData› | Optional transaction data: gas limit, gas price, and from address. |

**Returns:** *Promise‹string›*

The submitted transaction hash (ID).

___

###  toBaseUnits

▸ **toBaseUnits**(`value`: number | string | BigNumber, `decimals`: number): *BigNumber*

*Defined in [weth_helper.ts:204](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L204)*

Convert a "unit" value (user representation) to base-unit (wei) representation
used in contract logic.

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`value` | number &#124; string &#124; BigNumber | - | The value (as a number, string, or BigNumber) to convert. |
`decimals` | number | 18 | Optionally specify the number of decimals in a unit (default: 18).  |

**Returns:** *BigNumber*

___

###  unwrap

▸ **unwrap**(`amount`: BigNumber, `txDefaults?`: Partial‹TxData›): *Promise‹string›*

*Defined in [weth_helper.ts:95](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L95)*

Generate ETH by "un-wrapping" WETH: submitting a transaction to request a
withdrawal from the WETH contract.

Will send the transaction from the configured/detected `coinbase` address
unless overridden with `txDefaults` (second parameter).

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`amount` | BigNumber | The amount of Ether to un-wrap in base units (wei). |
`txDefaults?` | Partial‹TxData› | Optional transaction data: gas limit, gas price, and from address. |

**Returns:** *Promise‹string›*

The submitted transaction hash (ID).

___

###  wrap

▸ **wrap**(`amount`: BigNumber, `txDefaults?`: Partial‹TxData›): *Promise‹string›*

*Defined in [weth_helper.ts:71](https://github.com/hrharder/weth-helper/blob/1a475ff/src/weth_helper.ts#L71)*

Generate WETH by "wrapping" Ether: submitting it to the WETH contract using
the deposit method.

Will send the transaction from the configured/detected `coinbase` address
unless overridden with `txDefaults` (second parameter).

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`amount` | BigNumber | The amount of Ether to wrap in base units (wei). |
`txDefaults?` | Partial‹TxData› | Optional transaction data: gas limit, gas price, and from address. |

**Returns:** *Promise‹string›*

The submitted transaction hash (ID).
