<template>
  <el-dialog
    class="aiConfigDialog"
    :title="$t('ai.AIConfiguration')"
    :visible.sync="aiConfigDialogVisible"
    width="550px"
    append-to-body
  >
    <div class="aiConfigBox">
      <el-form
        :model="ruleForm"
        :rules="activeRules"
        ref="ruleFormRef"
        label-width="100px"
      >
        <template v-if="isDashboardAiMode">
          <div class="dashboardModeCard">
            <div>
              <p class="title">Dashboard Gemini</p>
              <p class="desc">当前嵌入 Sci Dashboard，直接复用默认 Gemini Key。这里只需要选择模型；留空时自动跟随仪表盘当前默认模型。</p>
            </div>
            <div class="dashboardModeMeta">
              <span class="modeTag">模型池已接管</span>
              <span class="modeHint">当前默认：{{ currentDashboardModel || '跟随 Dashboard 默认模型' }}</span>
            </div>
          </div>
          <el-form-item label="模型">
            <el-select v-model="ruleForm.model" clearable placeholder="跟随 Dashboard 默认模型" style="width: 100%;">
              <el-option label="跟随 Dashboard 默认模型" value=""></el-option>
              <el-option
                v-for="item in modelOptions"
                :key="item.id"
                :label="item.label || item.id"
                :value="item.id"
              ></el-option>
            </el-select>
          </el-form-item>
        </template>
        <template v-else>
          <p class="title">{{ $t('ai.VolcanoArkLargeModelConfiguration') }}</p>
          <p class="desc">
            {{ $t('ai.configTip') }}<a href="https://mp.weixin.qq.com/s/JNb7PH4sCjWzIZ9G8wStGQ" target="_blank">{{ $t('ai.course') }}</a
            >。
          </p>
          <el-form-item label="API Key" prop="key">
            <el-input v-model="ruleForm.key"></el-input>
          </el-form-item>
          <el-form-item :label="$t('ai.inferenceAccessPoint')" prop="model">
            <el-input v-model="ruleForm.model"></el-input>
          </el-form-item>
        <!-- <el-form-item label="接口" prop="api">
          <el-input v-model="ruleForm.api"></el-input>
        </el-form-item>
        <el-form-item label="请求方式" prop="method">
          <el-select v-model="ruleForm.method" placeholder="请选择">
            <el-option key="POST" label="POST" value="POST"></el-option>
            <el-option key="GET" label="GET" value="GET"></el-option>
          </el-select>
        </el-form-item> -->
        <!-- <p class="title">{{ $t('ai.mindMappingClientConfiguration') }}</p>
        <el-form-item :label="$t('ai.port')" prop="port">
          <el-input v-model="ruleForm.port"></el-input>
        </el-form-item> -->
        </template>
      </el-form>
    </div>
    <div slot="footer" class="dialog-footer">
      <el-button @click="cancel">{{ $t('ai.cancel') }}</el-button>
      <el-button type="primary" @click="confirm">{{
        $t('ai.confirm')
      }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

export default {
  model: {
    prop: 'visible',
    event: 'change'
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      aiConfigDialogVisible: false,
      ruleForm: {
        api: '',
        key: '',
        model: '',
        port: '',
        method: ''
      },
      rules: {
        api: [
          {
            required: true,
            message: this.$t('ai.apiValidateTip'),
            trigger: 'blur'
          }
        ],
        key: [
          {
            required: true,
            message: this.$t('ai.keyValidateTip'),
            trigger: 'blur'
          }
        ],
        model: [
          {
            required: true,
            message: this.$t('ai.modelValidateTip'),
            trigger: 'blur'
          }
        ],
        port: [
          {
            required: true,
            message: this.$t('ai.portValidateTip'),
            trigger: 'blur'
          }
        ],
        method: [
          {
            required: true,
            message: this.$t('ai.methodValidateTip'),
            trigger: 'blur'
          }
        ]
      }
    }
  },
  computed: {
    ...mapState(['aiConfig']),
    isDashboardAiMode() {
      try {
        return new URLSearchParams(window.location.search).get('hostBridge') === 'dashboard'
      } catch {
        return false
      }
    },
    modelOptions() {
      try {
        const raw = new URLSearchParams(window.location.search).get('aiModels')
        const list = raw ? JSON.parse(raw) : []
        return Array.isArray(list) ? list.filter(item => item && item.id) : []
      } catch {
        return []
      }
    },
    currentDashboardModel() {
      try {
        return new URLSearchParams(window.location.search).get('aiModel') || ''
      } catch {
        return ''
      }
    },
    activeRules() {
      return this.isDashboardAiMode ? {} : this.rules
    }
  },
  watch: {
    visible(val) {
      this.aiConfigDialogVisible = val
    },
    aiConfigDialogVisible(val, oldVal) {
      if (!val && oldVal) {
        this.close()
      }
    }
  },
  created() {
    this.initFormData()
  },
  methods: {
    ...mapMutations(['setLocalConfig']),

    close() {
      this.$emit('change', false)
    },

    initFormData() {
      Object.keys(this.aiConfig).forEach(key => {
        this.ruleForm[key] = this.aiConfig[key]
      })
      if (this.isDashboardAiMode && !this.ruleForm.model) {
        this.ruleForm.model = new URLSearchParams(window.location.search).get('aiModel') || ''
      }
    },

    cancel() {
      this.close()
      this.initFormData()
    },

    confirm() {
      this.$refs.ruleFormRef.validate(valid => {
        if (valid) {
          this.close()
          this.setLocalConfig({
            ...this.ruleForm
          })
          this.$message.success(this.$t('ai.configSaveSuccessTip'))
        }
      })
    }
  }
}
</script>

<style lang="less" scoped>
.aiConfigDialog {
  /deep/ .el-dialog__body {
    padding: 12px 20px;
  }

  .aiConfigBox {
    .dashboardModeCard {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
      padding: 14px 16px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(236, 253, 245, 0.92));
      border: 1px solid rgba(125, 211, 252, 0.42);
    }

    .dashboardModeMeta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      min-width: 140px;
    }

    .modeTag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 24px;
      padding: 0 10px;
      border-radius: 999px;
      background: rgba(59, 130, 246, 0.12);
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 700;
    }

    .modeHint {
      font-size: 12px;
      line-height: 1.5;
      text-align: right;
      color: #4b5563;
    }

    a {
      color: #409eff;
    }

    .title {
      margin-bottom: 8px;
      font-weight: bold;
    }

    .desc {
      margin-bottom: 0;
      padding-left: 12px;
      border-left: 5px solid #ccc;
    }
  }
}
</style>
