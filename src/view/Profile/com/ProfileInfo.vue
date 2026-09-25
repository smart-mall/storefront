<template>
  <div class="info">
    <section class="info__card">
      <h2 class="info__title">个人资料</h2>

      <div class="info__avatar">
        <el-upload
          :auto-upload="false"
          :show-file-list="false"
          :disabled="uploading"
          accept="image/png,image/jpeg,image/gif,image/webp"
          :on-change="onAvatarChange"
        >
          <el-avatar :size="72" :src="form.header ?? ''">{{ initial }}</el-avatar>
        </el-upload>
        <div>
          <div>点击头像上传新的</div>
          <div class="info__weak">支持 jpg / png / gif / webp；上传后要再点保存才生效</div>
        </div>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="72px" @submit.prevent>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" maxlength="64" placeholder="昵称" />
        </el-form-item>

        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio :value="0">未知</el-radio>
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="生日">
          <el-date-picker
            v-model="form.birth"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择生日"
            :disabled-date="isFuture"
          />
        </el-form-item>

        <el-form-item label="所在城市">
          <el-input v-model="form.city" maxlength="500" placeholder="选填" />
        </el-form-item>

        <el-form-item label="职业">
          <el-input v-model="form.job" maxlength="255" placeholder="选填" />
        </el-form-item>

        <el-form-item label="个性签名">
          <el-input
            v-model="form.sign"
            type="textarea"
            :rows="2"
            maxlength="255"
            show-word-limit
            placeholder="选填"
          />
        </el-form-item>

        <el-form-item>
          <el-button :disabled="saving" @click="onReset">重置</el-button>
          <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="info__card">
      <h2 class="info__title">账号信息</h2>

      <dl class="info__list">
        <div class="info__row">
          <dt>用户名</dt>
          <dd>{{ member?.username || '—' }}</dd>
        </div>
        <div class="info__row">
          <dt>手机号</dt>
          <dd>
            <span>{{ maskedMobile || '未绑定' }}</span>
            <el-button link type="primary" @click="openChange('mobile')">更换</el-button>
          </dd>
        </div>
        <div class="info__row">
          <dt>邮箱</dt>
          <dd>
            <span>{{ maskedEmail || '未绑定' }}</span>
            <el-button link type="primary" @click="openChange('email')">更换</el-button>
          </dd>
        </div>
        <div class="info__row">
          <dt>积分</dt>
          <dd>{{ member?.integration ?? '—' }}</dd>
        </div>
        <div class="info__row">
          <dt>成长值</dt>
          <dd>{{ member?.growth ?? '—' }}</dd>
        </div>
        <div class="info__row">
          <dt>注册时间</dt>
          <dd>{{ member?.createTime || '—' }}</dd>
        </div>
      </dl>
    </section>

    <ChangeContactDialog v-model="changeVisible" :kind="changeKind" @changed="onContactChanged" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  ElAvatar,
  ElButton,
  ElDatePicker,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElRadio,
  ElRadioGroup,
  ElUpload,
} from 'element-plus'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import ChangeContactDialog from './ChangeContactDialog.vue'
import { updateProfile } from '@/api/member'
import { uploadImage } from '@/api/media'
import { useAuthStore } from '@/store/auth'
import { maskEmail, maskMobile } from '@/tools/mask'
import type { MemberProfile, ProfileUpdateForm } from '@/type'

/**
 * 个人资料。
 *
 * 表单只覆盖后端白名单里那 7 个字段。等级、积分、成长值、用户名是只读的 ——
 * 它们由系统决定，后端也不接受从资料接口改。
 *
 * 手机号和邮箱不在这张表单里：它们是登录标识，改绑要过验证码（走 auth 的接口），
 * 所以各自一个弹窗。
 */
const auth = useAuthStore()

const member = computed<MemberProfile | null>(() => auth.member)

const formRef = ref<FormInstance>()
const saving = ref(false)
const uploading = ref(false)

/**
 * 表单本地状态。
 *
 * 不直接写成 `reactive<ProfileUpdateForm>`：`gender` 那边 el-radio-group 的 model 类型是
 * `string | number | boolean | undefined`，**不收 null**，所以本地用 undefined 表示"未选"，
 * 提交时再转回后端的 null。
 */
const form = reactive({
  nickname: '',
  header: null as string | null,
  gender: undefined as number | undefined,
  birth: null as string | null,
  city: null as string | null,
  job: null as string | null,
  sign: null as string | null,
})

const rules: FormRules = {
  nickname: [{ required: true, message: '昵称不能为空', trigger: 'blur' }],
}

const initial = computed(() => (form.nickname || auth.displayName || '?').slice(0, 1))
const maskedMobile = computed(() => maskMobile(member.value?.mobile))
const maskedEmail = computed(() => maskEmail(member.value?.email))

/** 把会员信息铺进表单。资料保存成功后也会走一次，等于用后端的值归一化表单 */
function fillFrom(value: MemberProfile | null): void {
  form.nickname = value?.nickname ?? ''
  form.header = value?.header ?? null
  form.gender = value?.gender ?? undefined
  // 后端返回的是 "yyyy-MM-dd HH:mm:ss"，而 date-picker 只认 yyyy-MM-dd
  form.birth = value?.birth ? value.birth.slice(0, 10) : null
  form.city = value?.city ?? null
  form.job = value?.job ?? null
  form.sign = value?.sign ?? null
}

watch(member, (value) => fillFrom(value), { immediate: true })

/** 生日不能选未来 */
function isFuture(date: Date): boolean {
  return date.getTime() > Date.now()
}

async function onAvatarChange(uploadFile: UploadFile): Promise<void> {
  const file = uploadFile.raw
  if (!file) {
    return
  }
  uploading.value = true
  try {
    const uploaded = await uploadImage(file)
    // 只写进表单，不直接提交：用户可能还要改别的字段，而且"上传了却没保存"是已知代价
    form.header = uploaded.url
    ElMessage.success('头像已上传，点保存后生效')
  } catch {
    // 请求层已经弹过提示（19001 格式不支持 / 19002 超出大小）
  } finally {
    uploading.value = false
  }
}

function onReset(): void {
  fillFrom(member.value)
  formRef.value?.clearValidate()
}

async function onSave(): Promise<void> {
  const instance = formRef.value
  if (!instance) {
    return
  }
  try {
    await instance.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const payload: ProfileUpdateForm = {
      nickname: form.nickname.trim(),
      header: form.header,
      // el-radio-group 用 undefined 表示未选，后端要的是 null
      gender: form.gender ?? null,
      birth: form.birth,
      city: form.city?.trim() || null,
      job: form.job?.trim() || null,
      sign: form.sign?.trim() || null,
    }
    const result = await updateProfile(payload)
    // 后端返回了新 token（昵称和头像在 JWT 里），换掉本地登录态，头部立刻更新
    auth.applyProfileUpdate(result)
    ElMessage.success('已保存')
  } catch {
    // 请求层已经弹过提示
  } finally {
    saving.value = false
  }
}

/* ═══════════════════ 换绑手机号 / 邮箱 ═══════════════════ */

const changeVisible = ref(false)
const changeKind = ref<'mobile' | 'email'>('mobile')

function openChange(kind: 'mobile' | 'email'): void {
  changeKind.value = kind
  changeVisible.value = true
}

/** 手机号/邮箱不在 JWT 里，后端不会重签 token，所以要强制回查一次才能显示新值 */
function onContactChanged(): void {
  void auth.loadCurrentMember(true)
}
</script>

<style scoped>
.info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info__card {
  padding: 20px;
  background: var(--mall-surface);
  border: 1px solid var(--mall-border);
  border-radius: var(--mall-radius-card);
}

.info__title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--mall-text);
}

.info__avatar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.info__weak {
  margin-top: 4px;
  font-size: 12px;
  color: var(--mall-text-weak);
}

.info__list {
  margin: 0;
}

.info__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--mall-border);
}

.info__row:last-child {
  border-bottom: none;
}

.info__row dt {
  flex: 0 0 72px;
  font-size: 13px;
  color: var(--mall-text-secondary);
}

.info__row dd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: var(--mall-text);
}
</style>
