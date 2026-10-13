/**
 * 已点赞评价的本地记录。
 *
 * 后端只维护一个获赞计数，不存"谁点过"，所以"我点过哪些评价"只能前端自己记：
 * 点赞与取消点赞各调一次接口，成功后再改这里，页面按它渲染高亮与「已赞 / 点赞」文案。
 *
 * 代价是换设备或清掉缓存后会重新认为没点过，再点会再加一次计数 —— 这是刻意的简化，
 * 不为此引入点赞记录表。
 *
 * key 与 `user-vue:token` 同一命名风格，值是一个评价 ID 数组的 JSON 文本。
 */

const LIKED_COMMENTS_KEY = 'user-vue:liked-comments'

/**
 * 读取本地点赞记录。
 *
 * @returns 已点赞的评价 ID 集合；没有记录或内容损坏时返回空集合
 */
export function readLikedIds(): Set<number> {
  const raw = localStorage.getItem(LIKED_COMMENTS_KEY)
  if (!raw) {
    return new Set()
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    // 只收数字：localStorage 的内容可以被用户手动改，脏数据不能带进渲染逻辑
    return new Set(
      Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [],
    )
  } catch {
    // 不是合法 JSON（手动改过、被别的代码覆盖）：当没点过，不阻断页面
    return new Set()
  }
}

/**
 * 写入本地点赞记录。
 *
 * @param ids 当前的已点赞评价 ID 集合
 */
export function writeLikedIds(ids: Iterable<number>): void {
  localStorage.setItem(LIKED_COMMENTS_KEY, JSON.stringify([...ids]))
}
