<template>
  <el-button :disabled="!canSend" :loading="sending" class="send-code-button" @click="send">
    {{ label }}
  </el-button>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { sendEmailCode, sendSmsCode } from '@/api/auth'
import { CODE_COOLDOWN_SECONDS, isValidEmail, isValidMobile } from '@/tools/validators'

const props = defineProps<{
  /** 走哪条链路的验证码 */
  kind: 'email' | 'sms'
  /** 收验证码的邮箱或手机号，由父组件从表单里传进来 */
  target: string
}>()

const sending = ref(false)
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

/**
 * 目标格式不对时不允许发送。
 *
 * 这不只是为了体验：sendCode 接口的 mobile 参数带 @Pattern 校验，
 * 格式不对会返回 10001；邮箱虽然不是格式校验失败，但也发不出去。
 * 与其让用户点了收到一个报错，不如先禁用。
 */
const targetValid = computed(() =>
  props.kind === 'email' ? isValidEmail(props.target) : isValidMobile(props.target),
)

const canSend = computed(() => targetValid.value && countdown.value === 0 && !sending.value)

const label = computed(() => (countdown.value > 0 ? `${countdown.value} 秒后重发` : '获取验证码'))

function startCountdown(): void {
  countdown.value = CODE_COOLDOWN_SECONDS
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      stopCountdown()
    }
  }, 1000)
}

function stopCountdown(): void {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
  countdown.value = 0
}

async function send(): Promise<void> {
  if (!canSend.value) {
    return
  }
  sending.value = true
  try {
    if (props.kind === 'email') {
      await sendEmailCode(props.target)
    } else {
      await sendSmsCode(props.target)
    }
    ElMessage.success('验证码已发送')
    // 后端有 60 秒防刷（重复发送返回 10004），这里同步倒计时，
    // 免得用户连点之后收到一串报错
    startCountdown()
  } catch {
    // 拦截器已经弹过提示了，这里不需要再弹一次
  } finally {
    sending.value = false
  }
}

onUnmounted(stopCountdown)
</script>

<style scoped>
.send-code-button {
  width: 108px;
}
</style>
