<script setup lang="ts">
/**
 * 投递抽屉 —— UI §6.6 / §7 / §9.1
 *
 * - 桌面端右侧滑出，移动端为底部抽屉（样式见 recruitment.css）。
 * - 校验：必填 + 格式（手机号 / 邮箱）+ 简历文件格式与大小（≤ 10MB）。
 * - 提交为**前端模拟**（产品书 §9.3）：成功后写入本地投递记录并通知父组件。
 * - 关闭方式：关闭按钮 / 遮罩 / Esc；打开时锁定背景滚动（§6.6 / §9.2）。
 * - 岗位已下线或已投递时，禁止提交并给出明确提示（§9.5 / §7）。
 */
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { useJobApplications } from '@/composables/useJobApplications'
import type { ApplyFormData, ApplyFormErrors, Job, JobApplication } from '@/types/recruitment'

const props = defineProps<{
  open: boolean
  job: Job | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submitted', application: JobApplication): void
}>()

const { addApplication, hasApplied } = useJobApplications()

/** 学历选项（UI §7） */
const EDUCATION_OPTIONS = ['大专', '本科', '硕士', '博士']

/** 简历文件限制（UI §7 / 产品书 §10.6） */
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx']
const PHONE_PATTERN = /^1[3-9]\d{9}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const createEmptyForm = (): ApplyFormData => ({
  name: '',
  phone: '',
  email: '',
  education: '',
  expectedCity: '',
  resumeFileName: '',
  agreed: false
})

const form = reactive<ApplyFormData>(createEmptyForm())
const errors = reactive<ApplyFormErrors>({})
const submitting = ref(false)
const isDragover = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

let previousOverflow = ''

const isClosed = computed(() => !!props.job && props.job.status !== '招聘中')
const alreadyApplied = computed(() => (props.job ? hasApplied(props.job.id) : false))
const canSubmit = computed(() => !submitting.value && !alreadyApplied.value && !isClosed.value)

const clearErrors = (): void => {
  const keys = Object.keys(errors) as Array<keyof ApplyFormData>
  keys.forEach((key) => {
    delete errors[key]
  })
}

const resetForm = (): void => {
  Object.assign(form, createEmptyForm())
  clearErrors()
  submitting.value = false
  isDragover.value = false
  if (fileInput.value) fileInput.value.value = ''
}

const lockScroll = (): void => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

const unlockScroll = (): void => {
  document.body.style.overflow = previousOverflow
}

const close = (): void => {
  if (submitting.value) return
  emit('close')
}

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      resetForm()
      lockScroll()
      window.addEventListener('keydown', onKeydown)
    } else {
      unlockScroll()
      window.removeEventListener('keydown', onKeydown)
    }
  }
)

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  unlockScroll()
})

const validate = (): boolean => {
  clearErrors()

  const name = form.name.trim()
  if (!name) errors.name = '请输入姓名'
  else if (name.length < 2 || name.length > 20) errors.name = '姓名长度需为 2–20 个字符'

  const phone = form.phone.trim()
  if (!phone) errors.phone = '请输入手机号'
  else if (!PHONE_PATTERN.test(phone)) errors.phone = '手机号格式不正确'

  const email = form.email.trim()
  if (!email) errors.email = '请输入常用邮箱'
  else if (!EMAIL_PATTERN.test(email)) errors.email = '邮箱格式不正确'

  if (form.expectedCity.trim().length > 20) errors.expectedCity = '期望城市不能超过 20 个字符'

  if (!form.resumeFileName) errors.resumeFileName = '请上传简历'

  if (!form.agreed) errors.agreed = '请先同意《隐私政策》与《投递须知》'

  return Object.keys(errors).length === 0
}

const handleFiles = (files: FileList | null): void => {
  const file = files && files[0]
  if (!file) return

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    errors.resumeFileName = '仅支持 PDF / DOC / DOCX 格式'
    form.resumeFileName = ''
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.resumeFileName = '文件大小不能超过 10MB'
    form.resumeFileName = ''
    return
  }

  form.resumeFileName = file.name
  delete errors.resumeFileName
}

const onFileChange = (event: Event): void => {
  handleFiles((event.target as HTMLInputElement).files)
}

const pickFile = (): void => {
  fileInput.value?.click()
}

const onDrop = (event: DragEvent): void => {
  isDragover.value = false
  handleFiles(event.dataTransfer?.files ?? null)
}

const onDragOver = (): void => {
  isDragover.value = true
}

const onDragLeave = (): void => {
  isDragover.value = false
}

const removeFile = (): void => {
  form.resumeFileName = ''
  if (fileInput.value) fileInput.value.value = ''
}

const submit = async (): Promise<void> => {
  if (!props.job || !canSubmit.value) return
  if (!validate()) return

  submitting.value = true

  // 模拟接口延时（纯前端演示，产品书 §9.3）
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 600)
  })

  const application = addApplication({
    jobId: props.job.id,
    jobTitle: props.job.title,
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    resumeFileName: form.resumeFileName,
    education: form.education || undefined,
    expectedCity: form.expectedCity.trim() || undefined
  })

  submitting.value = false
  emit('submitted', application)
}
</script>

<template>
  <Teleport to="body">
    <template v-if="open">
      <div class="rc-overlay" @click="close" />
      <aside class="rc-drawer rc-apply" role="dialog" aria-modal="true" aria-label="投递简历">
        <header class="rc-apply__head">
          <div>
            <h2 class="rc-apply__title">投递简历</h2>
            <p class="rc-apply__job">应聘岗位：{{ job ? job.title : '—' }}</p>
          </div>
          <button type="button" class="rc-apply__close" aria-label="关闭投递面板" @click="close">
            <AppIcon name="close" :size="20" />
          </button>
        </header>

        <div class="rc-apply__body">
          <p v-if="isClosed" class="rc-apply__notice">该岗位已停止招聘，暂不接受投递。</p>
          <p v-else-if="alreadyApplied" class="rc-apply__notice">
            您已投递过该岗位，请勿重复投递。
          </p>

          <template v-else>
            <div class="rc-field">
              <label class="rc-label" for="rc-apply-name">
                姓名 <span class="rc-label__required">*</span>
              </label>
              <input
                id="rc-apply-name"
                v-model="form.name"
                class="rc-input"
                :class="{ 'is-error': errors.name }"
                type="text"
                placeholder="请输入姓名"
              />
              <p v-if="errors.name" class="rc-field__error">{{ errors.name }}</p>
            </div>

            <div class="rc-field">
              <label class="rc-label" for="rc-apply-phone">
                手机号 <span class="rc-label__required">*</span>
              </label>
              <input
                id="rc-apply-phone"
                v-model="form.phone"
                class="rc-input"
                :class="{ 'is-error': errors.phone }"
                type="tel"
                placeholder="请输入手机号"
              />
              <p v-if="errors.phone" class="rc-field__error">{{ errors.phone }}</p>
            </div>

            <div class="rc-field">
              <label class="rc-label" for="rc-apply-email">
                邮箱 <span class="rc-label__required">*</span>
              </label>
              <input
                id="rc-apply-email"
                v-model="form.email"
                class="rc-input"
                :class="{ 'is-error': errors.email }"
                type="email"
                placeholder="请输入常用邮箱"
              />
              <p v-if="errors.email" class="rc-field__error">{{ errors.email }}</p>
            </div>

            <div class="rc-apply__row">
              <div class="rc-field">
                <label class="rc-label" for="rc-apply-education">学历</label>
                <select id="rc-apply-education" v-model="form.education" class="rc-select">
                  <option value="">请选择</option>
                  <option v-for="item in EDUCATION_OPTIONS" :key="item" :value="item">
                    {{ item }}
                  </option>
                </select>
              </div>

              <div class="rc-field">
                <label class="rc-label" for="rc-apply-city">期望城市</label>
                <input
                  id="rc-apply-city"
                  v-model="form.expectedCity"
                  class="rc-input"
                  :class="{ 'is-error': errors.expectedCity }"
                  type="text"
                  placeholder="如：北京"
                />
                <p v-if="errors.expectedCity" class="rc-field__error">{{ errors.expectedCity }}</p>
              </div>
            </div>

            <div class="rc-field">
              <span class="rc-label">
                上传简历 <span class="rc-label__required">*</span>
              </span>
              <div
                class="rc-upload"
                :class="{ 'is-error': errors.resumeFileName, 'is-dragover': isDragover }"
                role="button"
                tabindex="0"
                @click="pickFile"
                @keydown.enter.prevent="pickFile"
                @keydown.space.prevent="pickFile"
                @dragover.prevent="onDragOver"
                @dragleave.prevent="onDragLeave"
                @drop.prevent="onDrop"
              >
                <AppIcon name="upload" :size="22" />
                <span class="rc-upload__hint">点击或拖拽上传简历</span>
                <span class="rc-upload__sub">支持 PDF / DOC / DOCX，文件 ≤ 10MB</span>
              </div>
              <input
                ref="fileInput"
                class="rc-apply__file-input"
                type="file"
                accept=".pdf,.doc,.docx"
                @change="onFileChange"
              />
              <div v-if="form.resumeFileName" class="rc-upload__file">
                <AppIcon name="file" :size="14" />
                <span>{{ form.resumeFileName }}</span>
                <button
                  type="button"
                  class="rc-upload__remove"
                  aria-label="移除简历文件"
                  @click="removeFile"
                >
                  <AppIcon name="close" :size="12" />
                </button>
              </div>
              <p v-if="errors.resumeFileName" class="rc-field__error">{{ errors.resumeFileName }}</p>
            </div>

            <label class="rc-checkbox">
              <input v-model="form.agreed" type="checkbox" />
              <span>我已阅读并同意《隐私政策》与《投递须知》</span>
            </label>
            <p v-if="errors.agreed" class="rc-field__error">{{ errors.agreed }}</p>
          </template>
        </div>

        <footer v-if="!isClosed && !alreadyApplied" class="rc-apply__foot">
          <button
            type="button"
            class="rc-btn rc-btn--primary rc-btn--lg rc-btn--block"
            :disabled="!canSubmit"
            @click="submit"
          >
            {{ submitting ? '提交中…' : '提交投递' }}
          </button>
          <p class="rc-apply__tip">本页面为演示站点，提交为前端模拟，不会真实上传简历。</p>
        </footer>
      </aside>
    </template>
  </Teleport>
</template>

<style scoped>
.rc-apply {
  /* 视觉稿：右侧抽屉，全高 */
  overflow: hidden;
}

.rc-apply__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--rc-space-4);
  padding: var(--rc-space-6);
  border-bottom: 1px solid var(--rc-color-border);
}

.rc-apply__title {
  margin: 0;
  font-size: 22px;
  font-weight: var(--rc-font-weight-bold);
  color: var(--rc-color-text);
}

.rc-apply__job {
  margin: 6px 0 0;
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-text-secondary);
}

.rc-apply__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: none;
  border: none;
  border-radius: var(--rc-radius-sm);
  background-color: transparent;
  color: var(--rc-color-text-secondary);
  cursor: pointer;
}

.rc-apply__close:hover {
  background-color: #f1f5f9;
  color: var(--rc-color-text);
}

.rc-apply__body {
  flex: 1;
  overflow-y: auto;
  padding: var(--rc-space-6);
}

.rc-apply__foot {
  padding: var(--rc-space-6);
  border-top: 1px solid var(--rc-color-border);
  background-color: var(--rc-color-surface);
}

.rc-apply__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--rc-space-4);
}

.rc-apply__notice {
  margin: 0;
  padding: var(--rc-space-4);
  border-radius: var(--rc-radius-md);
  background-color: var(--rc-color-warning-bg);
  font-size: var(--rc-font-size-sm);
  color: var(--rc-color-warning-text);
}

.rc-apply__file-input {
  display: none;
}

.rc-apply__tip {
  margin: var(--rc-space-3) 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--rc-color-text-muted);
}

@media (max-width: 767px) {
  .rc-apply__row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .rc-apply__head,
  .rc-apply__body,
  .rc-apply__foot {
    padding: var(--rc-space-5);
  }
}
</style>
