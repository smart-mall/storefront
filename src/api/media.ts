/**
 * 媒体文件接口（third-party）。
 *
 * 改造后是**服务端直传**：调用方只提交文件，key 由服务端生成，拿回一个永久地址。
 * 改造前是 7 个预签名端点，前端拿到预签名 URL 直接存库，7 天后全站图片 403。
 *
 * ⚠️ 上传成功只是把文件放进了 MinIO，**不等于业务已经保存**。调用方要把返回的 url
 *    写进表单再提交业务接口；用户传了却放弃保存的话，那个文件就是孤儿。
 */

import { myAxios } from '@/tools/request'

export interface UploadedFile {
  url: string
  name: string
  size: number
}

/**
 * 上传接口的响应。
 *
 * ⚠️ 数据在**顶层**，不在 `data` 里 —— 后端是 `R.ok().put("url", ...).put("name", ...)`，
 *    也就是 request.ts 里说的第三类形状（`R.ok().put("page", p)` 同款）。
 *    照 `Result<T>` 去取 `res.data.data` 会拿到 undefined。
 */
interface UploadResponse {
  code: number
  msg: string
  url: string
  name: string
  size: number
}

/**
 * 上传单个文件。
 *
 * 后端按**文件头魔数**判定格式（不看扩展名、也不看 Content-Type），
 * 只接受 jpg / png / gif / webp，失败时返回：
 *   19000 文件为空 / 19001 格式不支持 / 19002 超出大小 / 19004 存储失败
 *
 * 不手动设 Content-Type：axios 见到 FormData 会自己带上 multipart 的 boundary，
 * 手写一个反而会把 boundary 丢掉，后端直接解析失败。
 */
export async function uploadImage(file: File): Promise<UploadedFile> {
  const data = new FormData()
  data.append('file', file)
  const res = await myAxios.post<UploadResponse>('/thirdParty/file/upload', data)
  return { url: res.data.url, name: res.data.name, size: res.data.size }
}
