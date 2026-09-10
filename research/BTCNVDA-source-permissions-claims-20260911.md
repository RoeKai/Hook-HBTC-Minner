# BTCNVDA 部署源码追溯、执行器权限与领取路径

报告日期：2026-09-11 UTC+8。采集区间：2026-09-10 21:35–21:45 UTC。
本报告为公开资料、部署字节码和只读模拟取证，不是独立安全审计或盈利承诺。未连接钱包、未请求签名、未广播任何交易、未部署任何链上合约。只修改隔离研究分支，没有修改工具应用或启用收费。

## 1. 原始证据与可复现边界
- 源码/元数据追溯：GitHub Actions run 34533038222，研究提交 e9696c42c3cee56ae60d30156e4d0ae422b1e2ff。
- 第一轮权限读取：run 34533448504，研究提交 3c7f603cc1fed7abae544e8b60c10a785358c2d1。
- 更近固定区块的权限与领取模拟：run 34533769693，研究提交 4bb1ab0a2c375853df05b03112cba2cc85b3d17a。
- 公共节点：https://rpc.mainnet.chain.robinhood.com ，chainId=4663。
- 所有原始 JSON、字节码及取证脚本由对应 workflow artifact 和日志保存；workflow success 不是协议安全 PASS。
- source artifact SHA-256：2265b9ebc851fce8c5e7682f5421641396f55dd0e61636c8c24f2f7d901102a9。
- 首轮 calls artifact SHA-256：439b14fc5f9d20221c317a562387a0fa10d78c2aaeed8883a07fcbed2aa897c6。
- 有效模拟 artifact SHA-256：484a4d7423b1044d205fa0171398684054f0f99a1ff7b20e434a495f8fc6eb09。

第一次尝试使用旧高度59358960时，节点返回 -32000 / metadata is not found, 59358963；这是节点历史状态不可用，不是合约拒绝。debug_traceCall返回 -32601 / method does not exist/is not available；未把这些失败写成合约测试通过。随后选用可读取的较近固定区块，并用eth_call内部临时执行与余额读取验证资金归属，没有绕过节点权限或广播。

## 2. 源码到底取得了什么
项目白皮书标识冻结版本 u4-release-candidate-v0.1。实际读取四份完整运行字节码，CBOR元数据均标记solc=00 08 1a，即0.8.26。下列指纹与上一轮已记录运行字节码一致；只能证明这些采样之间代码相同，不证明完整源码已经复现编译或所有外部依赖不可升级。

| 对象 | 地址 | 字节数 | 运行字节码SHA-256 |
|---|---|---:|---|
| Hook | 0x541c980ed3e0b5ced0bde5352c32bdab9d26a0cc | 28264 | 5851bbeb2bd38695fc36543a1e1cc6399e1a10a00c309117e68f4066e10c7e6d |
| BTCNVDA Token | 0xdd83f3bb1539f52778314b018c401c0efe3e617f | 2009 | 8e9294070d327445461d6b658314540f392b392700723217c2d6c11d3fc77212 |
| 被观察的账户专用Miner | 0x6b9e91b781f24dd3f374ec9008017e6328757e71 | 5619 | a3d4d3e528289100c06eaf0ecdd9a46f0ab55ef21c1207fe7f73bf7a2a9928bb |
| Factory | 0x3f6f537a565581b21d44ae928db438d7220e886e | 5324 | ac8da4257fa04c59256bb08aa9a20cad242df1d7d6dda5766097e1f4408482ec |

这些是SHA-256取证指纹，不是EVM EXTCODEHASH。
读取高度59729080，hash=0xea3a3d3ae9c8b683848df54a0276f8530979f86eefe3054cdd412ff29c6d0b27，时间2026-09-10 21:35:45 UTC。

从部署字节码末尾解出IPFS元数据标识：
- Hook：Qmbeur1McfY4r8p8kjjwynU1gB7mePsiBeeHYMiWuntzuZ。
- Token：QmT7i4DoGU32qAtPqrapZATFRw9f77nA5WpBa72UCYhj5L。
- Miner：QmVRktFxhTvHJkcVD5Hy1ZkgTz3S4D97Kj4WYMuSjuuxG6。
- Factory：QmQdZW6dEfaXFJpig2YFZNJqiyTkf3oEmeXz4rZoLvCTqU。

公开Github对BTCStockMiner及BTC Stock Protocol检索未找到目标源码。Sourcify v2对四地址返回404/match=null；本轮Blockscout合约端点遭403挑战，不绕过访问控制。ipfs.io、dweb.link、gateway.pinata.cloud未在设置的只读超时内返回目标元数据，cloudflare-ipfs.com无法解析。网关超时不证明内容永久不存在。项目当前公开白皮书/路线图仍声明站点包不含合约和辅助工具源码。

结论：已取得完整运行字节码、编译器版本和内容标识，但原始.sol源文件、全量依赖、标准编译输入、优化设置、构造参数及源码到部署码的完整匹配仍未完成。字节码反汇编/语义恢复不冒充原始Solidity源码。
源码接入验收还需要对应release的源码与依赖、ABI、solc standard-json输入/输出、构造参数/immutableReferences/library链接信息，再复现编译核对部署码。现有信息不足以宣称无隐藏权限或全场景安全。

## 3. Miner接口与权限：部署代码直接证据
被观察的Miner不是官方公共共享入口，不能向其授权或转账。其owner与beneficiary都为0xa761b292a2587e9fdc32eddac44dc00e37db3da2。
部署分发表识别到七个入口，与下列签名Keccak选择器一致：
- mine(uint256,uint256)：071e9503；入口PC0x7e，执行体PC0x1b4。
- owner()：8da5cb5b；getter内嵌固定owner字面量。
- beneficiary()：38af3eed；getter内嵌固定受益人字面量。
- manager()：481c6a75；固定为0x8366a39cc670b4001a1121b8f6a443a643e40951。
- hook()：7f5a7c7b；固定为目标Hook。
- chainId()：9a8a0592；4663。
- unlockCallback(bytes)：91dd7346；执行体PC0xaa0。

mine在PC0x1b7读取CALLER，在PC0x1c0载入固定owner地址并比较；同时检查执行中标志和chainId。拒绝分支返回82b42900，与Unauthorized()选择器一致。callback比较CALLER与固定PoolManager，并要求执行中标志，不能只冒用PoolManager地址在空闲状态进入。
没有在这份分发表中发现修改owner/beneficiary、配置运营者、签名委托、累计预算、有效期、指定目标轮次等入口。外层策略授权不能仅由普通ERC20 approve推导得到。

推论：用户EOA持有owner权限时，后台另一个EOA直接调用mine会被拒绝；即使用户给出NVDA额度，这项调用者检查仍在。新建普通中间合约去调用同一用户EOA拥有的Miner也不能自动通过，因为msg.sender会变成中间合约。要实现无用户私钥无人值守，需要受用户控制并有受限策略验证的执行账户，或者单独审计的新受限执行合约；不能把该样本当成已经具有这项能力。

## 4. 固定区块只读模拟：不是开发方自报
成功模拟基准高度59733968（0x38f77d0），hash=0x646ed2ea0ac0f079bd9cc25b21597a08c1fbbfc28c06d33312512e3ead901530；当前协议轮次602，存储费率250bps。时间取自节点，不使用本机时钟变更协议状态。
使用公开eth_call；from字段是模拟条件，未获取/使用该账户私钥，不代表控制其账户。未广播交易。

| 场景 | 结果 |
|---|---|
| 非owner调用mine，同一有效预算 | 回滚0x82b42900 |
| owner调用mine | 成功返回paid=3175758780000005，work=3175758780000004 |
| 用户给出的预算 | 3191717366834175 NVDA最小单位 |
| minimumWork | 3166260000000002，实际Work满足 |
| 非PoolManager调用callback | 回滚0x82b42900 |
| 模拟PoolManager在未执行时调用callback | 回滚0x82b42900 |
| owner使用0预算 | 回滚0x556a73ec，与BadBudget()一致 |
| owner设置远超预算的minimumWork | 回滚0x02a387d3 |
| 普通外部账户直接mint Token | 回滚0x6f61f641 |
| Hook.hbtc()与Token.pool() | 分别指向BTCNVDA Token及Hook，互相吻合 |

NVDA为18位精度。上述mine模拟实际支出0.003175758780000005 NVDA，Work 0.003175758780000004；支出比Work多1个最小单位。本次只证明这个预算/区块/调用条件，不概括成所有金额永远固定差1。
minimumWork保护的是实际贡献下限，不是最终代币奖励下限；其他人仍可在同轮随后增加Work，改变最终分母。

## 5. 领取入口的字节码语义
以下是从运行字节码恢复的控制流摘要，不是项目原始源码：
```
claim()              -> _claim(msg.sender, 64)
claimUpTo(n)         -> _claim(msg.sender, n)
settleFor(miner)     -> _claim(miner, uint256最大值)
```
claim入口PC0x910跳至0x13f7，再将CALLER与0x40送入内部函数0x243b。
claimUpTo入口PC0x62a经0x1064，将CALLER与用户参数送入0x243b。
settleFor入口PC0x7ed经0x12c4，将地址参数与PUSH0/NOT产生的uint256最大值送入0x243b。
内部循环在PC0x246d开始，受参与数组长度、传入最大条数与成熟轮次约束；PC0x24f0写回领取游标，再走铸币。没有把三个入口统称为同一个64条上限。
因此claim是默认64条；claimUpTo可指定数量；settleFor没有显式小批参数，长历史需额外关注Gas，不应无限等待后盲目代领。当前有效模拟样本恰有64条成熟记录，没有对百万条历史实测。

## 6. 代领的资产到底给谁：同一次临时EVM执行内核对
基准账户原始BTCNVDA余额0，claimCursor=0；pendingRewards=44731061746647111820291最小单位。
普通eth_call结果：
- owner调用claimUpTo(1)：715404700739336837813，即715.404700739336837813 BTCNVDA。
- owner调用claim()：44731061746647111820291，即44731.061746647111820291 BTCNVDA。
- owner调用claimUpTo(128)：本样本返回同样总额。
- 无Work外部地址直接调用claim/claimUpTo(1)：返回0。
- 无关外部地址调用settleFor(owner)：可结算owner的同样总额。

为核对调用后的资产去向，在一个不持久化的创建式eth_call中执行自写临时探针：查询受益人/探针余额与游标，调用settleFor(owner)，重读，再重复调用settleFor(owner)。这不是生产部署，没有任何广播。
十个嵌套调用均成功，返回：
| 观测 | 原始整数结果 |
|---|---:|
| 受益人BTCNVDA领取前 | 0 |
| 临时调用者BTCNVDA领取前 | 0 |
| claimCursor领取前 | 0 |
| 首次代领返回数量 | 44731061746647111820291 |
| 受益人BTCNVDA领取后 | 44731061746647111820291 |
| 临时调用者BTCNVDA领取后 | 0 |
| claimCursor领取后 | 64 |
| 立即重复代领返回数量 | 0 |
| 重复代领后受益人余额 | 44731061746647111820291 |
| 重复代领后游标 | 64 |

模拟结束后，同一区块独立重读原账户余额及游标仍为0，说明没有写入真实链。样本验证了第三方能帮助触发领取，但不能仅凭settleFor把这笔受益人的奖励变成自己的；领取重复调用不在该样本中双铸。它不等同于全部恶意合约/重入/极端历史安全审计。

节点同区块eth_estimateGas：
- mine(owner)：331551 Gas。
- claimUpTo(1)：94847 Gas。
- claim()本样本64条：593962 Gas。
- claimUpTo(128)本样本同64条：594205 Gas。
- settleFor(owner)本样本64条：594469 Gas。
这些是Gas单位估算，不是已支付ETH或美元成本，不能固定到所有未来账户。可以看到批量处理的摊薄空间，但不能直接用首次1条Gas乘64宣称精确节省比例。

## 7. 独立复核与剩余边界
本地重新检查下载artifact SHA-256、四份字节码指纹、分发表及owner常量，并对实际eth_call原始结果、十个临时观测、重复领取和非持久性作断言，共27项，27通过。它们是静态+取证结果一致性检查，不是27项完整安全审计、不代表R1产品验收通过。

仍缺：对应冻结版本的完整原始源码及可复现编译材料；完整Miner部署构造过程/非相同owner-beneficiary实例；所有权限/退款/极端金额/恶意token/升级依赖路径的系统性测试；长历史实际Gas边界；奖励真实卖出的净报价和市场容量。没有真实卖出报价，不能把44731个奖励当成可兑现利润，更不能给出确定年化收益。

## 8. 对后续产品的结论
- 不能再把钱包连接、代币approve和无人值守mine权限合并。
- 普通买入与纯挖矿必须是不同策略；纯挖的主要消耗是NVDA费用贡献，不保证收到等额现货。
- minimumWork不保证最终奖励；当前两参数mine本身也没有暴露expectedRound/deadline/总预算/每日上限，未来执行账户策略需要额外边界。
- 代领的受益人固定于Work账户，不应为收费改写奖励接收者或要求私钥。遇到长历史，要估Gas并采用用户可执行的受控批次，不能假定settleFor也自动64条。
- 研究目标从“最多执行/最多发币”改为“在用户预算、权限和风险约束内，优化可兑现净收益”。源码匹配未完成前只研究、仿真和只读评估，不启动主网自动收费执行。
