# BTCNVDA 项目机制研究（2026-09-10）

## 证据性质和来源
本文是阅读公开页面、静态前端文件、协议白皮书和技术路线图后的归纳，不把文档等同于已审计部署源码。
固定身份、周期、费率快照等独立链上读数见 BTCNVDA-identity-and-chain-evidence-20260910.md。
原文采集日志：https://github.com/RoeKai/Hook-HBTC-Minner/actions/runs/34469839325 （首页和sites.mjs）、34470203161（平台与配置）、34470416805（白皮书、路线图）。
公开原始地址：
- https://btcnvda.com/?share=en-v2
- https://btcnvda.com/assets/protocol.json
- https://bsptreasury.com/protocol/
- https://bsptreasury.com/protocol/docs/whitepaper/
- https://bsptreasury.com/protocol/docs/roadmap/
白皮书和路线图版本1.2，页面标注2026-09-06，适用u4-release-candidate-v0.1。
白皮书 HTTP200，55813 bytes，SHA-256 c26887bb95a9eb9c62302fda53b08c5e1a356681f3fad365d61fd516d3f3e860。
路线图 HTTP200，30820 bytes，SHA-256 8fea85110d0aa4eb21be62614d53d5014b213783ab7bba14f2e7e0f01bacc15f。

## 资产及角色
平台品牌BSP Treasury，协议名BTC Stock Protocol；BTCNVDA是独立实例。
NVDA是既有股票代币，用于交易定价、实际协议费用和储备。BTCNVDA是本协议发行的独立ERC20，不是NVDA股票权利，也不是BTC。
ETH仅是Robinhood Chain网络Gas资产。文档中的ETH/USDG转NVDA和股票代币代付Gas属于后续能力，不能认为已接通。
协议借用2100万总量、定时发行、减半的设计，但不是Bitcoin PoW，也不继承Bitcoin网络安全；没有GPU挖Bitcoin或NVDA股票的过程。

## 核心：两本平行账
账一：用户合格买入的实际协议费用（Toll），全额计入该轮个人Work，决定后续BTCNVDA增发分配。
账二：Toll按平台、项目、维护和买墙用途分配，决定NVDA储备及回购活动。
因此奖励不是将NVDA手续费按份直接退给矿工。Work不是算力、买入总额、普通存款或扣除平台分成后的净买墙金额。
普通卖出会收费，但不产生同样的买入Work；普通ERC20转账、无本实例Hook的其他池交易不计本实例Work。
公开规则以官方Uniswap v4 Hook的exact-input买入为入口，exact-output路径会拒绝（此项源于白皮书，本次未发送交易验证）。
没有找到“协议强制每人每轮仅买一次”的已验证规则。Work按轮累计；第三方工具自行限制每轮一次不能冒充协议限制。

## 普通买入与纯挖矿不能混同
普通买入：NVDA换BTCNVDA现货，同时实际买入Toll产生Work；买到的现货与后续挖矿奖励是两份独立结果。
纯挖矿：白皮书描述BTCStockMiner通过极紧价格限制，让现货交换极小，主要实际消耗用于合格买入Toll；仍走官方池和相同Work规则，没有直接写Work或特权铸币接口。
文档给出的owner是部署辅助执行器时固定的调用方，出资并收退款及少量现货；beneficiary是部署时固定的Work和奖励受益人，两者可以不同。
budget是本次最多转入的NVDA，paid是与PoolManager结算后的实际支出，work是实际受益人Work增量，refund=budget-paid。费用已实际花掉的部分不是可退本金。
minimumWork不足或支出超budget应整笔回滚。只退本次余额，不应扫走执行器历史捐赠余额。
白皮书描述执行器先以budget的99.5%作名义费用目标，用读到的费率反推gross，再用sqrtNow-1价格限制交易；这不是实际Work必定达到budget的99.5%的承诺。
原因之一是beforeSwap可能先调整费率，再收取Toll。应以实际费用、Work增量、退款为结果。
Work通过hookData显式指定beneficiary；普通买入若不提供对应数据，白皮书描述回退到交易发起EOA。合约账户或bundler不能直接假定等于用户。
本次未取得官方辅助Miner源码、源码匹配或官方可用入口；上述权限和退款限制仍属于需要独立核验的文档约束。

## 发行、创世和领取
总量上限21000000 BTCNVDA；精度18。H=21000000*10^18。
b=floor((链上时间-genesisTimestamp)/600)，e=floor(b/4320)。每轮600秒，每4320轮减半，即30天。
scheduled(b)=floor((H>>(e+1))/4320)。初期每轮2430.555555555555555555 BTCNVDA。
target(e)=10777023386140748>>e，以NVDA最小单位表示；初始0.010777023386140748 NVDA。
个人奖励=floor(scheduled*个人Work/max(本轮总Work,本轮target))。
个人Work或总Work为0时奖励为0。低于目标的未分配份额不会过后补给参与者；超过目标则按实际竞争份额分配。
初始目标是无竞争时拿满当轮计划份额所需的Work，不是最低准入金额，不是投资回报保证，也不包含Gas。
目标随发行周期减半，不随即时竞争上调；需求反馈主要作用于动态费率。
前144轮是创世期，约350000 BTCNVDA用于协议自有流动性POL，不分给创建者；这部分也占第一4320轮发行周期，不在公开参与时重置epoch。
时间应计、settleGenesis铸币、flushPol入池、公共交易执行是不同环节。settleGenesis可一次处理全部已结束的创世轮，flushPol只处理已有待入池币；首次有效公开swap可以在同一交易中完成补结算和POL入池。
已经锁住POL仓位不意味着仓内代币永不交易，polDeposited是累计注入量而非当前池余额。
当前轮奖励只是估计；结束后通过领取交易结算铸给受益人。按文档claim()默认最多处理64条参与记录，claimUpTo(maxEntries)可限制批次，settleFor(miner)可代触发但奖励仍给miner。
claimCursor防重复；rewardOf可能仍返回已领取历史奖励计算值，因此非零rewardOf不等于未领取。官网个人历史每页最多16项，小计不等于全历史收益；持币余额还包含买入和转账。
未发送领取或结算交易，未把这些文档说明标记为本次端到端交易测试通过。

## 动态费率
初始化3%，边界1%–10%；实际存储费率固定区块读取为2.7%。
按白皮书，lastRetargetBlockIndex初始144；距上次调整至少144轮后，由下一次合格swap惰性触发一次调整，不是后台定时任务，也不把空缺窗口循环补算。
窗口累计买入Work/实际经过轮数得到mean；首次直接用mean，之后EMA为旧值与新mean各一半。
与当前target比较生成0.5到2倍调整因子；最后钳制在100到1000bps。当前swap先可能调费，后收费，本次Work进入下一统计窗口。
若首笔公开swap在144至287轮，仍用初始3%；若直到288轮或以后才出现首笔，且target非零，历史密度为0可能先调至1.5%。这是规则说明，不代表已经观察到本实例首笔的此种情形。

## Toll如何分配
买入gross为指定输入，toll=floor(gross*实际rateBps/10000)；卖出基数为池返回正NVDA输出。纯挖的名义gross与实际paid不能混为一谈。
platform=floor(toll*30%)；project=toll-platform。
维护补充=min(floor(project*2%),维护储备剩余空间)；project剩余进入pendingToNet。
维护储备上限0.04527 NVDA。维护未满且不受cap约束时，整个Toll约30%平台、1.4%维护、68.6%买墙；满额后约30%平台、70%买墙。
这些百分比在原有协议费内分，不是额外向用户再收30%或2%。Work仍按完整实际买入Toll，不按70%或68.6%。
协议平台接收方在配置中为0xc3527e179b03aa0a61cfc8ff835d65163128dac4；这里的平台是BSP的固定收款方，不自动是第三方工具运营方。
费用会形成PoolManager内的NVDA结算claims与Hook账本，不表示每次收费都立即转到外部平台钱包；claimPlatformRevenue是独立兑付，文档称收款方固定。
维护成功poke最多获得min(0.001509 NVDA,keeperEscrow)的ERC6909 NVDA claims，不保证覆盖ETH Gas；claims须兑换成外部NVDA。harvest不支付同样的心跳奖励。

## 七层买墙与风险边界
名义下跌档位5%、10%、15%、20%、30%、40%、50%，通过tick-spacing60的集中流动性区间实现，不是七笔精确限价订单。
新增资金分配受最深档覆盖指标kappa3与40%–80%深档约束影响；不是简单固定等额七分。
NVDA买回BTCNVDA后，通过harvest/维护回收再销毁；不是每次用户卖出都即时销毁，也不是销毁NVDA。
初次建墙需价格观察、有效资金和安全锚点；后续poke除价格等条件外通常至少间隔144轮。无人执行时不会靠网页倒计时自动维护。
买回会消耗NVDA储备；没有固定价托底、随时按净资产赎回或本金保证。NVDA本身有股票价格、发行人、兑换及转让权限风险。
pendingToNet、tierState、keeperEscrow、platformAccrued、累计已转换金额、累计已烧毁量、POL不是同一种可提余额；不能相加成用户可取储备或利润。

## 研究结论
已足以区分NVDA储备资产、BTCNVDA发行资产、两种参与方式、发行和费用账本以及储备回购逻辑。
但完整源码匹配、安全权限验证、官方Miner身份、交易失败/退款/领取的全路径测试仍未完成，不应据本研究宣布合约安全或普通买入等同纯挖矿。
