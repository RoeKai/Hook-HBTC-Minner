# BTCNVDA 官网公开接口复核（2026-09-11）

本轮目标：回答“是否完全拿不到挖矿相关合约及ABI”。仅公共HTTP读取，不连接钱包、不执行下载的JavaScript、不请求签名、不广播交易；没有更改应用或触发Codex云开发。

## 1. 原始证据

采集时间：2026-09-11 09:01:01至09:02:52 UTC。

- 公共页面及模块：run 34582030220 / job 103207593949，研究提交60cec1ba62244e8d9efaa0ba3be1e5b31bfc98b3；artifact10191994712，89713字节，ZIP SHA256 93055e9567be47f51bf0c28997341912cad6cbac0259f8fd42ce1f310746e4ae。
- 领取核心及协议文档：run34582188131 / job103208100137，研究提交5e4a06b2724efb1e3aab898c90938dce97220829；artifact10192055532，224799字节，ZIP SHA256 56297ccc34ff86238609cf4cf6c5ff75990797df8cc97556a5df538fcb5a4a06。
- 两份artifact均已下载核对ZIP摘要；index.json记录来源、时间、状态、长度与文件SHA256，*.raw保存原始响应。采集脚本有数量和大小限制，不是对互联网或全站进行穷尽扫描。第二份含同白皮书不同fragment的重复读取，不把重复页当不同证据。

## 2. 确实拿到的文件（全部HTTP200）

| 来源 | 字节数 | SHA256 | 内容边界 |
|---|---:|---|---|
| https://btcnvda.com/assets/protocol.json |1890|ceaa75f324efc47d24ce9a75ce54055afe3733d05fa2b9795a85167e698c7f10|链、资产、Hook、项目Factory、池标识和参数；不是完整ABI|
| https://btcnvda.com/assets/sites.mjs |39929|b3ba7219bcbf480acac7329f5190afde0184cad09fa3f1d86234ec7bfa44985e|实际导入并挂载buy-ui与claim-ui，非仅孤立未使用文件|
| https://btcnvda.com/assets/buy-core.mjs |18964|8886773d3ed645dad3a0eeb0d635fd621960b9096a07b726826e872883303583|普通买入的编码、交易校验和回执核对；不等于纯挖执行器|
| https://btcnvda.com/assets/claim-core.mjs |11000|36916febfba3ea13151489137bdb7f07f521ff72fd0c2eebaed83ee58a31db9a|实际领取交易编码、预检、恢复、回执及到账验证|
| https://btcnvda.com/assets/claim-ui.mjs |8952|a7c14694a2ba2815b94f9d33eac1b2c55345cb85f44d815b479d9834c3cab680|领取按钮、确认、查询与恢复，GET /api/claim?action=...|
| https://bsptreasury.com/protocol/docs/whitepaper/ |55632|af20a40b104b12f334a4611dc43ad8500799926837f43dad2432d923189c9ae3|1.2版/2026-09-06的规则和参考模块名，不是Solidity源码包|
| https://bsptreasury.com/protocol/docs/roadmap/ |30639|670e68098bb64e32512f8b1da02252bce102153d09e29fbf0210c06c5b027750|明确说明网站包不包括合约和辅助工具源码|

本次首页meta build为16bd83b。旧研究的buy-core内容和摘要与本次不同，不能把旧模块行为一概当最新事实。

## 3. 可直接用于接入研究的身份

protocol.json与本次buy-core固定身份一致：
- chainId：4663（0x1237）
- NVDA：0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec（18 decimals）
- BTCNVDA：0xdd83f3bb1539f52778314b018c401c0efe3e617f
- Hook：0x541c980ed3e0b5ced0bde5352c32bdab9d26a0cc
- 项目Factory：0x3f6f537a565581b21d44ae928db438d7220e886e
- poolId：0x4cc2e5d23e1c94645466ba014ea2b0c1834d8c6f0527d0a67b3878738ac08c6d

白皮书描述Factory创建Hook/Token/池；没有据此证明它是个人Miner工厂。配置publicCreationEnabled=false不能独立当成个人Miner链上创建权限的证据。

## 4. 新确认：官网已公开领取前端实现

claim-core导出CLAIM_DATA=0x4e71d92d，与此前部署字节码/eth_call核对的claim()入口一致。
其validateClaim明确要求：
- from为当前领取账户；to为固定Hook；data固定0x4e71d92d；value=0x0；chainId=0x1237。
- 网页批次为64；账户、块哈希、nonce、费用字段及最多30秒的估计有效期被校验。
- nextGasMaximumWei必须等于gas乘maxFeePerGas，余额覆盖所需费用。
- verifyClaimReceipt核对原交易和回执、Hook事件、BTCNVDA从零地址到该账户的Transfer，并配平实际奖励；允许其他人提前settleFor导致实际领取比预估少甚至为0。
- claim-ui的请求采用/api/claim?action=prepare与action=receipt等查询，实际广播由用户钱包确认后eth_sendTransaction完成。

接入结论：领取的目标、调用编码和客户端校验逻辑不是未知。已有成熟Work奖励的受益人通过该路径直接调用Hook，不需先创建一个新个人Miner来领取；这与新用户如何产生Work是独立问题。

证据边界：本轮读取了完整前端实现，没有测试这些API当前可用性，没有执行用户钱包端到端领取，也没有重做链上模拟。不据此批准生产写入或宣称前端所有安全检查完备。

## 5. 普通买入不是纯挖矿

buy-core提供Permit2/Router调用编码、明确的Hook data和Work回执核对，足以作为准确接口来源之一；这不包含个人Miner部署逻辑。
本次buy-core还包含长期/大额度授权策略，不能照抄当作我们产品的必要授权。我们的有限额度和用户明确确认要求不变。公开代码可读也不等于已授权复制全部实现，优先独立实现标准调用和验证。

## 6. 仍没有取得的资料

路线图第09节明确写道：
“Contract and auxiliary-tool source code is not included in this site package.”
其源码模块名称是规则引用，并不是可下载.sol链接。

本轮额外查询：
- Sourcify v2：Hook与历史样本Miner的记录均HTTP404，未取得源码。
- Blockscout smart-contracts API：两者均HTTP403；这是本轮访问失败，不能据此断言当前仍未验证。
- 历史样本Miner的IPFS元数据CID：网关HTTP429，停止请求；限流不证明元数据永远无法取得。

因此目前没有取得完整u4-release-candidate-v0.1原始Solidity/编译材料，或已核验的官方个人Miner创建入口。没有在已读取页面找到不等于全网绝对不存在。
历史样本Miner 0x6b9e91b781f24dd3f374ec9008017e6328757e71属于既有特定账户，owner权限和beneficiary已在旧研究核对。它不能配置成所有新用户共用的spender或矿机。

## 7. 文档和现有页面状态不同步

1.2版白皮书和路线图仍写普通交易及领取入口尚未开放；本轮现有sites.mjs已经实际挂载买入和领取模块。必须分别记录“旧文档状态”“已取得前端实现”“实际交易是否成功”，不得选择性地把三者混为一谈。

## 8. 对开发要求的澄清（不是资金操作批准）

“全量官方ABI没有拿到”不等于“任何功能都不能继续”。按实际调用的函数/事件整理最小接口，并分别核验字节码身份、参数、返回值、权限、回执和资产归属。ABI只定义调用/返回格式，不证明合约内部逻辑安全。技术参考：https://docs.soliditylang.org/en/latest/abi-spec.html 。

现有LIVE-MINER-01继续，不另开界面迭代：
- 读取、领取按实际公开代码与已验证接口继续实现和测试；不要把领取统一绑在Miner创建缺失上。
- 纯挖新用户路径继续研发可审查自有Miner和明确创建方式；调用原Hook/PoolManager，在未替换协议代码或Work/奖励状态的分叉上验证两个新用户。不能用普通现货买入或旧样本Miner替代。
- 保留底层源码未匹配的风险记录和生产写入禁用；不把missing改成matched，不自行主网部署/广播。
- 后续阻塞必须指出具体缺少的函数、参数类型、权限或失败交易证据，不能笼统只报“缺完整ABI”。
