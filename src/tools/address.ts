/**
 * 收货地址的展示格式化与行政区划树处理。
 *
 * 放 tools/ 而不是写在组件里：结算页的地址卡片和订单卡片都要拼这一串，
 * 而且它是纯函数，按 tools/ 的约定可以直接用 node 跑断言验证。
 */

import type { AreaNode, MemberAddress } from '@/type'

/**
 * 把地址的几段拼成一行，null / 空串会被丢掉。
 *
 * 逐段过滤而不是直接 join(' ')：省市区在库里允许为 null（实测有的地址 region 就是 null），
 * 不过滤会拼出 "湖南 长沙 null 望城区" 这种脏字符串。
 *
 * 单独暴露这个通用版本是因为订单卡片拼的是 `receiverProvince` 那一套字段
 * （订单表里存的是下单时的收货快照），形状和 MemberAddress 不一样。
 */
export function joinAddress(parts: (string | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part !== '').join(' ')
}

/** 收货地址对象 → 一行地址 */
export function formatAddress(address: MemberAddress): string {
  return joinAddress([address.province, address.city, address.region, address.detailAddress])
}

/** 收货地址要的层级：省 / 市 / 区 */
export const ADDRESS_LEVELS = 3

/**
 * 把行政区划树裁到前 depth 层。
 *
 * 为什么必须裁：那棵树来自统计局数据，层级最深到居委会（`NODE_LEVEL` 0~5），
 * 而收货地址只要省市区三级。节点上又**没有层级字段**（后端是 `AreaTreeNode{code,name,children}`），
 * 前端只能按深度数。
 *
 * 根节点在后端是按 `codeParent == "0"` 判的，所以第 1 层就是根，depth = 3 即省 / 市 / 区。
 */
export function pruneAddressTree(nodes: AreaNode[], depth: number): AreaNode[] {
  if (depth <= 0) {
    return []
  }
  return nodes.map((node) => {
    const children = node.children?.length ? pruneAddressTree(node.children, depth - 1) : []
    // 叶子要**不带 children 字段**，而不是 children: [] 或 null：
    // 级联器把空数组也当"可展开"，会渲染出一个空面板；null 则不符合它的类型
    return children.length
      ? { code: node.code, name: node.name, children }
      : { code: node.code, name: node.name }
  })
}

/**
 * 按 code 路径取出各级名称。
 *
 * 级联器绑的是 code 路径（`['110000','110100','110101']`），而库里存的是名称，
 * 所以要在树上走一遍把名字还原出来。路径对不上时返回已走通的那几级。
 */
export function resolveAreaNames(tree: AreaNode[], codes: string[]): string[] {
  const names: string[] = []
  let level = tree
  for (const code of codes) {
    const node = level.find((item) => item.code === code)
    if (!node) {
      break
    }
    names.push(node.name)
    level = node.children ?? []
  }
  return names
}

/**
 * 反查级联器需要的 code 路径（编辑已有地址时用来回填）。
 *
 * 优先按 code 找 —— 库里存了 `areacode` 时最准；找不到就按名称逐级匹配：
 * 历史数据里 `areacode` 可能是 null，而且那个 code 也可能已经不在树里了。
 * 两条都走不通就返回空数组，让用户重新选一次，而不是填错。
 */
export function findAreaPath(
  tree: AreaNode[],
  code: string | null | undefined,
  names: (string | null | undefined)[],
): string[] {
  if (code) {
    const byCode = searchByCode(tree, code)
    if (byCode.length) {
      return byCode
    }
  }
  const wanted = names.filter((name): name is string => typeof name === 'string' && name !== '')
  return wanted.length ? searchByNames(tree, wanted) : []
}

function searchByCode(nodes: AreaNode[], code: string, path: string[] = []): string[] {
  for (const node of nodes) {
    const next = [...path, node.code]
    if (node.code === code) {
      return next
    }
    if (node.children?.length) {
      const found = searchByCode(node.children, code, next)
      if (found.length) {
        return found
      }
    }
  }
  return []
}

function searchByNames(nodes: AreaNode[], wanted: string[], path: string[] = []): string[] {
  const target = wanted[path.length]
  if (target === undefined) {
    return path
  }
  for (const node of nodes) {
    if (node.name !== target) {
      continue
    }
    const next = [...path, node.code]
    if (next.length === wanted.length) {
      return next
    }
    if (node.children?.length) {
      const found = searchByNames(node.children, wanted, next)
      if (found.length) {
        return found
      }
    }
  }
  return []
}
