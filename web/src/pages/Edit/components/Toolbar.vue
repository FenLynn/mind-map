<template>
  <div class="toolbarContainer" :class="{ isDark: isDark }">
    <div class="toolbar" ref="toolbarRef">
      <!-- 节点操作 -->
      <div class="toolbarBlock">
        <ToolbarNodeBtnList :list="horizontalList"></ToolbarNodeBtnList>
        <!-- 更多 -->
        <el-popover
          v-model="popoverShow"
          placement="bottom-end"
          width="120"
          trigger="hover"
          v-if="showMoreBtn"
          :style="{ marginLeft: horizontalList.length > 0 ? '20px' : 0 }"
        >
          <ToolbarNodeBtnList
            dir="v"
            :list="verticalList"
            @click.native="popoverShow = false"
          ></ToolbarNodeBtnList>
          <div slot="reference" class="toolbarBtn">
            <span class="icon iconfont icongongshi" data-fallback="更"></span>
            <span class="text">{{ $t('toolbar.more') }}</span>
          </div>
        </el-popover>
      </div>
      <!-- 导出 -->
      <div class="toolbarBlock">
        <div class="toolbarBtn" :class="{ disabled: !canUseNativeDirectory }" @click="openDirectory" v-if="!isMobile">
          <span class="icon iconfont icondakai" data-fallback="录"></span>
          <span class="text">{{ $t('toolbar.directory') }}</span>
        </div>
        <el-tooltip
          effect="dark"
          :content="$t('toolbar.newFileTip')"
          placement="bottom"
          v-if="!isMobile"
        >
          <div class="toolbarBtn" :class="{ disabled: !isLocalFsAvailable }" @click="createNewLocalFileSafe">
            <span class="icon iconfont iconxinjian" data-fallback="新"></span>
            <span class="text">{{ $t('toolbar.newFile') }}</span>
          </div>
        </el-tooltip>
        <el-tooltip
          effect="dark"
          :content="$t('toolbar.openFileTip')"
          placement="bottom"
          v-if="!isMobile"
        >
          <div class="toolbarBtn toolbarBtnAccent local" :class="{ disabled: !isLocalFsAvailable }" @click="openLocalFileSafe">
            <span class="icon iconfont iconwenjian1" data-fallback="原"></span>
            <span class="text">打开原始</span>
          </div>
        </el-tooltip>
        <div class="toolbarBtn toolbarBtnAccent local" :class="{ disabled: !isLocalFsAvailable }" @click="saveLocalFileSafe" v-if="!isMobile">
          <span class="icon iconfont iconlingcunwei" data-fallback="另"></span>
          <span class="text">另存原始</span>
        </div>
        <div class="toolbarBtn toolbarBtnAccent cloud" @click="openCloudManager('save')" v-if="!isMobile">
          <span class="icon iconfont iconshangchuan" data-fallback="云"></span>
          <span class="text">存入云盘</span>
        </div>
        <div class="toolbarBtn toolbarBtnAccent cloud" @click="openCloudManager('load')" v-if="!isMobile">
          <span class="icon iconfont icondakai" data-fallback="盘"></span>
          <span class="text">打开云盘</span>
        </div>
        <div
          class="toolbarBtn toolbarBtnAccent image"
          @click="saveLocalImage"
          v-if="!isMobile"
        >
          <span class="icon iconfont iconexport" data-fallback="图"></span>
          <span class="text">图片存本地</span>
        </div>
        <div class="toolbarBtn toolbarBtnAccent image" @click="openCloudManager('image')" v-if="!isMobile">
          <span class="icon iconfont iconshangchuan" data-fallback="上传"></span>
          <span class="text">图片存云端</span>
        </div>
        <!-- 本地文件树 -->
        <div
          class="fileTreeBox"
          v-if="fileTreeVisible"
          :class="{ expand: fileTreeExpand }"
        >
          <div class="fileTreeToolbar">
            <div class="fileTreeName">
              {{ rootDirName ? '/' + rootDirName : '' }}
            </div>
            <div class="fileTreeActionList">
              <div
                class="btn"
                :class="[
                  fileTreeExpand ? 'el-icon-arrow-up' : 'el-icon-arrow-down'
                ]"
                @click="fileTreeExpand = !fileTreeExpand"
              ></div>
              <div
                class="btn el-icon-close"
                @click="fileTreeVisible = false"
              ></div>
            </div>
          </div>
          <div class="fileTreeWrap">
            <el-tree
              :props="fileTreeProps"
              :load="loadFileTreeNode"
              :expand-on-click-node="false"
              node-key="id"
              lazy
            >
              <span class="customTreeNode" slot-scope="{ node, data }">
                <div class="treeNodeInfo">
                  <span
                    class="treeNodeIcon iconfont"
                    :class="[
                      data.type === 'file' ? 'iconwenjian' : 'icondakai'
                    ]"
                  ></span>
                  <span class="treeNodeName">{{ node.label }}</span>
                </div>
                <div class="treeNodeBtnList" v-if="data.type === 'file'">
                  <el-button
                    type="text"
                    size="mini"
                    v-if="data.enableEdit"
                    @click="editLocalFile(data)"
                    >编辑</el-button
                  >
                  <el-button
                    type="text"
                    size="mini"
                    v-else
                    @click="importLocalFile(data)"
                    >导入</el-button
                  >
                </div>
              </span>
            </el-tree>
          </div>
        </div>
      </div>
    </div>
    <NodeImage></NodeImage>
    <NodeHyperlink></NodeHyperlink>
    <NodeIcon></NodeIcon>
    <NodeNote></NodeNote>
    <NodeTag></NodeTag>
    <Export></Export>
    <Import ref="ImportRef"></Import>
    <input ref="fallbackFileInput" type="file" accept=".smm,.json" style="display: none" @change="onFallbackLocalFileChange" />
    <el-dialog
      title="云端脑图"
      :visible.sync="cloudDialogVisible"
      width="620px"
      custom-class="cloudMindmapDialog"
      :close-on-click-modal="false"
    >
      <div class="cloudManagerHead">
        <div class="cloudManagerIntro">
          <strong>当前操作</strong>
          <span>{{ cloudMode === 'save' ? '保存当前脑图到云端，可直接覆盖已有文件。' : cloudMode === 'image' ? '保存当前脑图导出的 PNG 图片到云端，命名和列表管理统一在这里完成。' : '从云端文件列表中选中并打开脑图。' }}</span>
        </div>
        <el-button size="mini" @click="refreshCloudFiles" :loading="cloudBusy">刷新列表</el-button>
      </div>
      <div class="cloudManagerForm">
        <span class="cloudManagerLabel">文件名</span>
        <el-input
          v-model="cloudFilename"
          size="small"
          :placeholder="cloudMode === 'image' ? '例如：项目脑图.png' : '例如：项目脑图.smm'"
          @keyup.enter.native="cloudMode === 'load' ? loadCloudFile() : cloudMode === 'image' ? saveCloudImage() : saveCloudFile()"
        ></el-input>
      </div>
      <div class="cloudManagerBody" v-loading="cloudBusy">
        <div class="cloudManagerTips">
          <span>{{ cloudMode === 'image' ? '单击选中图片文件，可继续覆盖保存或删除。' : '单击选中文件，双击直接打开。' }}</span>
          <span v-if="cloudFiles.length">共 {{ cloudFiles.length }} 个云端{{ cloudMode === 'image' ? '图片' : '文件' }}</span>
        </div>
        <div class="cloudFileList" v-if="cloudFiles.length">
          <button
            v-for="file in cloudFiles"
            :key="file"
            class="cloudFileItem"
            :class="{ active: cloudSelectedFile === file }"
            type="button"
            @click="selectCloudFile(file)"
            @dblclick="cloudMode === 'load' && loadCloudFile(file)"
          >
            <span class="cloudFileName">{{ file }}</span>
            <span class="cloudFileTag" v-if="cloudMode !== 'image' && cloudCurrentFile === file">当前</span>
          </button>
        </div>
        <div class="cloudFileEmpty" v-else>{{ cloudMode === 'image' ? '云端还没有 PNG 图片，先输入一个文件名后点击保存。' : '云端还没有脑图文件，先输入一个文件名后点击保存。' }}</div>
      </div>
      <span slot="footer" class="dialog-footer cloudManagerFooter">
        <el-button size="small" @click="cloudDialogVisible = false">关闭</el-button>
        <el-button size="small" type="danger" plain :disabled="!cloudSelectedFile" @click="deleteCloudFile">删除选中</el-button>
        <el-button v-if="cloudMode === 'load'" size="small" :disabled="!resolveCloudFilename()" @click="loadCloudFile()">打开选中</el-button>
        <el-button v-if="cloudMode === 'image'" size="small" type="primary" :disabled="!resolveCloudFilename()" @click="saveCloudImage">保存图片</el-button>
        <el-button v-else-if="cloudMode === 'save'" size="small" type="primary" :disabled="!resolveCloudFilename()" @click="saveCloudFile">保存到云端</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import NodeImage from './NodeImage.vue'
import NodeHyperlink from './NodeHyperlink.vue'
import NodeIcon from './NodeIcon.vue'
import NodeNote from './NodeNote.vue'
import NodeTag from './NodeTag.vue'
import Export from './Export.vue'
import Import from './Import.vue'
import { mapState } from 'vuex'
import { Notification } from 'element-ui'
import exampleData from 'simple-mind-map/example/exampleData'
import { getData, saveCloudData, loadCloudData, listCloudFiles, listCloudImages, deleteCloudData, uploadCloudImage, isMindmapHostBridgeAvailable } from '../../../api'
import ToolbarNodeBtnList from './ToolbarNodeBtnList.vue'
import { throttle, isMobile } from 'simple-mind-map/src/utils/index'

// 工具栏
let fileHandle = null
const defaultBtnList = [
  'back',
  'forward',
  'painter',
  'siblingNode',
  'childNode',
  'deleteNode',
  'image',
  'icon',
  'link',
  'note',
  'tag',
  'summary',
  'associativeLine',
  'formula',
  // 'attachment',
  'outerFrame',
  'annotation',
  'ai'
]

export default {
  components: {
    NodeImage,
    NodeHyperlink,
    NodeIcon,
    NodeNote,
    NodeTag,
    Export,
    Import,
    ToolbarNodeBtnList
  },
  data() {
    const hostBridgeEnabled = isMindmapHostBridgeAvailable()
    return {
      isMobile: isMobile(),
      horizontalList: [],
      verticalList: [],
      showMoreBtn: true,
      popoverShow: false,
      fileTreeProps: {
        label: 'name',
        children: 'children',
        isLeaf: 'leaf'
      },
      fileTreeVisible: false,
      rootDirName: '',
      fileTreeExpand: true,
      waitingWriteToLocalFile: false,
      canUseNativeDirectory: Boolean(!hostBridgeEnabled && window.isSecureContext && window.showDirectoryPicker),
      canUseNativeLocalFile: Boolean(!hostBridgeEnabled && window.isSecureContext && window.showOpenFilePicker && window.showSaveFilePicker),
      isLocalFsAvailable: true,
      hostBridgeEnabled,
      cloudDialogVisible: false,
      cloudBusy: false,
      cloudFiles: [],
      cloudFilename: '',
      cloudSelectedFile: '',
      cloudCurrentFile: '',
      cloudMode: 'load'
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      isHandleLocalFile: state => state.isHandleLocalFile,
      openNodeRichText: state => state.localConfig.openNodeRichText,
      enableAi: state => state.localConfig.enableAi
    }),

    btnLit() {
      let res = [...defaultBtnList]
      if (!this.openNodeRichText) {
        res = res.filter(item => {
          return item !== 'formula'
        })
      }
      if (!this.enableAi) {
        res = res.filter(item => {
          return item !== 'ai'
        })
      }
      return res
    }
  },
  watch: {
    isHandleLocalFile(val) {
      if (!val) {
        Notification.closeAll()
      }
    },
    btnLit: {
      deep: true,
      handler() {
        this.computeToolbarShow()
      }
    }
  },
  created() {
    this.$bus.$on('write_local_file', this.onWriteLocalFile)
  },
  mounted() {
    this.computeToolbarShow()
    this.computeToolbarShowThrottle = throttle(this.computeToolbarShow, 300)
    window.addEventListener('resize', this.computeToolbarShowThrottle)
    this.$bus.$on('lang_change', this.computeToolbarShowThrottle)
    window.addEventListener('beforeunload', this.onUnload)
    this.$bus.$on('node_note_dblclick', this.onNodeNoteDblclick)
  },
  beforeDestroy() {
    this.$bus.$off('write_local_file', this.onWriteLocalFile)
    window.removeEventListener('resize', this.computeToolbarShowThrottle)
    this.$bus.$off('lang_change', this.computeToolbarShowThrottle)
    window.removeEventListener('beforeunload', this.onUnload)
    this.$bus.$off('node_note_dblclick', this.onNodeNoteDblclick)
  },
  methods: {
    // 计算工具按钮如何显示
    computeToolbarShow() {
      if (!this.$refs.toolbarRef) return
      const windowWidth = window.innerWidth - 40
      const all = [...this.btnLit]
      let index = 1
      const loopCheck = () => {
        if (index > all.length) return done()
        this.horizontalList = all.slice(0, index)
        this.$nextTick(() => {
          const width = this.$refs.toolbarRef.getBoundingClientRect().width
          if (width < windowWidth) {
            index++
            loopCheck()
          } else if (index > 0 && width > windowWidth) {
            index--
            this.horizontalList = all.slice(0, index)
            done()
          }
        })
      }
      const done = () => {
        this.verticalList = all.slice(index)
        this.showMoreBtn = this.verticalList.length > 0
      }
      loopCheck()
    },

    // 监听本地文件读写
    onWriteLocalFile(content) {
      clearTimeout(this.timer)
      if (fileHandle && this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = true
      }
      this.timer = setTimeout(() => {
        this.writeLocalFile(content)
      }, 1000)
    },

    onUnload(e) {
      if (this.waitingWriteToLocalFile) {
        const msg = '存在未保存的数据'
        e.returnValue = msg
        return msg
      }
    },

    // 加载本地文件树
    async loadFileTreeNode(node, resolve) {
      try {
        let dirHandle
        if (node.level === 0) {
          dirHandle = await window.showDirectoryPicker()
          this.rootDirName = dirHandle.name
        } else {
          dirHandle = node.data.handle
        }
        const dirList = []
        const fileList = []
        for await (const [key, value] of dirHandle.entries()) {
          const isFile = value.kind === 'file'
          if (isFile && !/\.(smm|xmind|md|json)$/.test(value.name)) {
            continue
          }
          const enableEdit = isFile && /\.smm$/.test(value.name)
          const data = {
            id: key,
            name: value.name,
            type: value.kind,
            handle: value,
            leaf: isFile,
            enableEdit
          }
          if (isFile) {
            fileList.push(data)
          } else {
            dirList.push(data)
          }
        }
        resolve([...dirList, ...fileList])
      } catch (error) {
        console.log(error)
        this.fileTreeVisible = false
        resolve([])
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 扫描本地文件夹
    openDirectory() {
      if (!this.canUseNativeDirectory) {
        this.$message.warning('当前浏览器不支持原始文件直读写，请改用云端按钮。')
        return
      }
      this.fileTreeVisible = false
      this.fileTreeExpand = true
      this.rootDirName = ''
      this.$nextTick(() => {
        this.fileTreeVisible = true
      })
    },

    // 编辑指定文件
    editLocalFile(data) {
      if (data.handle) {
        fileHandle = data.handle
        this.readFile()
      }
    },

    // 导入指定文件
    async importLocalFile(data) {
      try {
        const file = await data.handle.getFile()
        this.$refs.ImportRef.onChange({
          raw: file,
          name: file.name
        })
        this.$refs.ImportRef.confirm()
      } catch (error) {
        console.log(error)
      }
    },

    // 打开本地文件
    async openLocalFile() {
      try {
        let [_fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: '',
              accept: {
                'application/json': ['.smm']
              }
            }
          ],
          excludeAcceptAllOption: true,
          multiple: false
        })
        if (!_fileHandle) {
          return
        }
        fileHandle = _fileHandle
        if (fileHandle.kind === 'directory') {
          this.$message.warning(this.$t('toolbar.selectFileTip'))
          return
        }
        this.readFile()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    openLocalFileSafe() {
      if (this.canUseNativeLocalFile) {
        this.openLocalFile()
        return
      }
      this.$refs.fallbackFileInput.value = ''
      this.$refs.fallbackFileInput.click()
    },

    saveLocalFileSafe() {
      if (this.canUseNativeLocalFile) {
        this.saveLocalFile()
        return
      }
      this.downloadLocalSnapshot(getData(), this.cloudCurrentFile || 'mindmap.smm')
    },

    createNewLocalFileSafe() {
      if (this.canUseNativeLocalFile) {
        this.createNewLocalFile()
        return
      }
      this.$store.commit('setIsHandleLocalFile', false)
      this.$bus.$emit('setData', exampleData)
      this.downloadLocalSnapshot(exampleData, 'mindmap.smm')
      this.$message.success('已生成新的本地脑图文件')
    },

    onFallbackLocalFileChange(event) {
      const [file] = Array.from(event.target.files || [])
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        fileHandle = null
        this.$store.commit('setIsHandleLocalFile', false)
        this.setData(reader.result)
        this.$message.success(`已打开本地文件：${file.name}`)
      }
      reader.onerror = () => {
        this.$message.error('读取本地文件失败')
      }
      reader.readAsText(file)
    },

    downloadLocalSnapshot(content, filename = 'mindmap.smm') {
      const safeName = String(filename || 'mindmap.smm').replace(/\.(json|smm)$/i, '')
      const normalized = `${safeName}.smm`
      const blob = new Blob([JSON.stringify(content)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = normalized
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    },

    // 读取本地文件
    async readFile() {
      let file = await fileHandle.getFile()
      let fileReader = new FileReader()
      fileReader.onload = async () => {
        this.$store.commit('setIsHandleLocalFile', true)
        this.setData(fileReader.result)
        Notification.closeAll()
        Notification({
          title: this.$t('toolbar.tip'),
          message: `${this.$t('toolbar.editingLocalFileTipFront')}${
            file.name
          }${this.$t('toolbar.editingLocalFileTipEnd')}`,
          duration: 0,
          showClose: true
        })
      }
      fileReader.readAsText(file)
    },

    // 渲染读取的数据
    setData(str) {
      try {
        let data = JSON.parse(str)
        if (typeof data !== 'object') {
          throw new Error(this.$t('toolbar.fileContentError'))
        }
        if (data.root) {
          this.isFullDataFile = true
        } else {
          this.isFullDataFile = false
          data = {
            ...exampleData,
            root: data
          }
        }
        this.$bus.$emit('setData', data)
      } catch (error) {
        console.log(error)
        this.$message.error(this.$t('toolbar.fileOpenFailed'))
      }
    },

    // 写入本地文件
    async writeLocalFile(content) {
      if (!fileHandle || !this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = false
        return
      }
      if (!this.isFullDataFile) {
        content = content.root
      }
      let string = JSON.stringify(content)
      const writable = await fileHandle.createWritable()
      await writable.write(string)
      await writable.close()
      this.waitingWriteToLocalFile = false
    },

    // 创建本地文件
    async createNewLocalFile() {
      await this.createLocalFile(exampleData)
    },

    // 另存为
    async saveLocalFile() {
      let data = getData()
      await this.createLocalFile(data)
    },

    resolveCloudFilename() {
      let filename = String(this.cloudFilename || this.cloudSelectedFile || '').trim()
      if (!filename) return ''
      if (this.cloudMode === 'image') {
        return /\.png$/i.test(filename) ? filename : `${filename}.png`
      }
      return /\.smm$/i.test(filename) ? filename : `${filename}.smm`
    },

    async openCloudManager(mode = 'load') {
      this.cloudMode = mode
      this.cloudDialogVisible = true
      await this.refreshCloudFiles()
      if (mode === 'image') {
        const suggested = String(this.cloudCurrentFile || 'mindmap-export').replace(/\.smm$/i, '.png')
        this.cloudFilename = this.cloudSelectedFile || suggested
        return
      }
      this.cloudFilename = this.cloudCurrentFile || this.resolveCloudFilename() || 'mindmap.smm'
    },

    async refreshCloudFiles() {
      try {
        this.cloudBusy = true
        const files = this.cloudMode === 'image' ? await listCloudImages() : await listCloudFiles()
        this.cloudFiles = files.slice().sort((a, b) => a.localeCompare(b, 'zh-CN'))
        if (this.cloudSelectedFile && !this.cloudFiles.includes(this.cloudSelectedFile)) {
          this.cloudSelectedFile = ''
        }
        if (this.cloudMode !== 'image' && !this.cloudSelectedFile && this.cloudCurrentFile && this.cloudFiles.includes(this.cloudCurrentFile)) {
          this.cloudSelectedFile = this.cloudCurrentFile
        }
      } catch (error) {
        this.$message.error(error.message || '读取云端列表失败')
      } finally {
        this.cloudBusy = false
      }
    },

    selectCloudFile(filename) {
      this.cloudSelectedFile = filename
      this.cloudFilename = filename
    },

    exportCurrentImage() {
      return new Promise((resolve, reject) => {
        this.$bus.$emit('exportRaw', {
          args: ['png', false],
          resolve,
          reject
        })
      })
    },

    async saveCloudImage() {
      try {
        const filename = this.resolveCloudFilename()
        if (!filename) return
        const png = await this.exportCurrentImage()
        const blob = await fetch(png).then(response => response.blob())
        try {
          await uploadCloudImage(filename, blob, false)
        } catch (error) {
          if (String(error.message || '').includes('Image already exists')) {
            await this.$confirm(`云端已存在 ${filename}，是否覆盖图片？`, '覆盖确认', {
              confirmButtonText: '覆盖',
              cancelButtonText: '取消',
              type: 'warning'
            })
            await uploadCloudImage(filename, blob, true)
          } else {
            throw error
          }
        }
        this.cloudSelectedFile = filename
        this.cloudFilename = filename
        await this.refreshCloudFiles()
        this.$message.success(`图片已保存到云端：${filename}`)
      } catch (error) {
        if (error === 'cancel') return
        if (String(error?.message || '').includes('cancel')) return
        this.$message.error(error.message || '云端图片保存失败')
      }
    },

    async saveLocalImage() {
      try {
        const filename = String(this.cloudCurrentFile || 'mindmap-export').replace(/\.smm$/i, '.png')
        const png = await this.exportCurrentImage()
        const anchor = document.createElement('a')
        anchor.href = png
        anchor.download = /\.png$/i.test(filename) ? filename : `${filename}.png`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        this.$message.success(`图片已保存到本地：${anchor.download}`)
      } catch (error) {
        this.$message.error(error.message || '本地图片保存失败')
      }
    },

    async saveCloudFile() {
      try {
        const filename = this.resolveCloudFilename()
        if (!filename) return
        const data = getData()
        try {
          await saveCloudData(filename, data, false)
        } catch (error) {
          if (String(error.message || '').includes('File already exists')) {
            await this.$confirm(`云端已存在 ${filename}，是否覆盖保存？`, '覆盖确认', {
              confirmButtonText: '覆盖',
              cancelButtonText: '取消',
              type: 'warning'
            })
            await saveCloudData(filename, data, true)
          } else {
            throw error
          }
        }
        this.cloudCurrentFile = filename.endsWith('.smm') ? filename : `${filename}.smm`
        this.cloudSelectedFile = this.cloudCurrentFile
        this.cloudFilename = this.cloudCurrentFile
        await this.refreshCloudFiles()
        this.$message.success('云端保存成功')
      } catch (error) {
        if (error === 'cancel') return
        if (String(error?.message || '').includes('cancel')) return
        this.$message.error(error.message || '云端保存失败')
      }
    },

    async loadCloudFile(filename) {
      try {
        if (this.cloudMode === 'image') return
        const target = String(filename || this.resolveCloudFilename() || '').trim()
        if (!target) return
        const data = await loadCloudData(target)
        this.setData(JSON.stringify(data))
        this.cloudCurrentFile = target.endsWith('.smm') ? target : `${target}.smm`
        this.cloudSelectedFile = this.cloudCurrentFile
        this.cloudFilename = this.cloudCurrentFile
        this.cloudDialogVisible = false
        this.$message.success('云端文件已载入')
      } catch (error) {
        if (error === 'cancel') return
        if (String(error?.message || '').includes('cancel')) return
        this.$message.error(error.message || '云端加载失败')
      }
    },

    async deleteCloudFile() {
      try {
        const filename = String(this.cloudSelectedFile || '').trim()
        if (!filename) return
        await this.$confirm(`确认删除云端${this.cloudMode === 'image' ? '图片' : '文件'} ${filename}？`, '删除确认', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
        await deleteCloudData(filename, this.cloudMode === 'image' ? 'image' : 'file')
        if (this.cloudMode !== 'image' && this.cloudCurrentFile === filename) {
          this.cloudCurrentFile = ''
        }
        if (this.cloudFilename === filename) {
          this.cloudFilename = ''
        }
        this.cloudSelectedFile = ''
        await this.refreshCloudFiles()
        this.$message.success(this.cloudMode === 'image' ? '云端图片已删除' : '云端文件已删除')
      } catch (error) {
        if (error === 'cancel') return
        if (String(error?.message || '').includes('cancel')) return
        this.$message.error(error.message || (this.cloudMode === 'image' ? '删除云端图片失败' : '删除云端文件失败'))
      }
    },

    // 创建本地文件
    async createLocalFile(content) {
      try {
        let _fileHandle = await window.showSaveFilePicker({
          types: [
            {
              description: '',
              accept: { 'application/json': ['.smm'] }
            }
          ],
          suggestedName: this.$t('toolbar.defaultFileName')
        })
        if (!_fileHandle) {
          return
        }
        const loading = this.$loading({
          lock: true,
          text: this.$t('toolbar.creatingTip'),
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        })
        fileHandle = _fileHandle
        this.$store.commit('setIsHandleLocalFile', true)
        this.isFullDataFile = true
        await this.writeLocalFile(content)
        await this.readFile()
        loading.close()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    onNodeNoteDblclick(node, e) {
      e.stopPropagation()
      this.$bus.$emit('showNodeNote', node)
    }
  }
}
</script>

<style lang="less" scoped>
.toolbarContainer {
  &.isDark {
    .toolbar {
      color: hsla(0, 0%, 100%, 0.9);
      .toolbarBlock {
        background-color: #262a2e;

        .fileTreeBox {
          background-color: #262a2e;

          /deep/ .el-tree {
            background-color: #262a2e;

            &.el-tree--highlight-current {
              .el-tree-node.is-current > .el-tree-node__content {
                background-color: hsla(0, 0%, 100%, 0.05) !important;
              }
            }

            .el-tree-node:focus > .el-tree-node__content {
              background-color: hsla(0, 0%, 100%, 0.05) !important;
            }

            .el-tree-node__content:hover,
            .el-upload-list__item:hover {
              background-color: hsla(0, 0%, 100%, 0.02) !important;
            }
          }

          .fileTreeWrap {
            .customTreeNode {
              .treeNodeInfo {
                color: #fff;
              }

              .treeNodeBtnList {
                .el-button {
                  padding: 7px 5px;
                }
              }
            }
          }
        }
      }

      .toolbarBtn {
        .icon {
          background: transparent;
          border-color: transparent;
        }

        &:hover {
          &:not(.disabled) {
            .icon {
              background: hsla(0, 0%, 100%, 0.05);
            }
          }
        }

        &.disabled {
          color: #54595f;
        }
      }
    }
  }
  .toolbar {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    top: 20px;
    width: max-content;
    display: flex;
    font-size: 12px;
    font-family: PingFangSC-Regular, PingFang SC;
    font-weight: 400;
    color: rgba(26, 26, 26, 0.8);
    z-index: 2;

    .toolbarBlock {
      display: flex;
      background-color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.06);
      margin-right: 20px;
      flex-shrink: 0;
      position: relative;

      &:last-of-type {
        margin-right: 0;
      }

      .fileTreeBox {
        position: absolute;
        left: 0;
        top: 68px;
        width: 100%;
        height: 30px;
        background-color: #fff;
        padding: 12px 5px;
        padding-top: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 5px;
        min-width: 200px;
        box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);

        &.expand {
          height: 300px;

          .fileTreeWrap {
            visibility: visible;
          }
        }

        .fileTreeToolbar {
          width: 100%;
          height: 30px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e9e9e9;
          margin-bottom: 12px;
          padding-left: 12px;

          .fileTreeName {
          }

          .fileTreeActionList {
            .btn {
              font-size: 18px;
              margin-left: 12px;
              cursor: pointer;
            }
          }
        }

        .fileTreeWrap {
          width: 100%;
          height: 100%;
          overflow: auto;
          visibility: hidden;

          .customTreeNode {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            padding-right: 5px;

            .treeNodeInfo {
              display: flex;
              align-items: center;

              .treeNodeIcon {
                margin-right: 5px;
                opacity: 0.7;
              }

              .treeNodeName {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }

            .treeNodeBtnList {
              display: flex;
              align-items: center;
            }
          }
        }
      }
    }

    .toolbarBtn {
      display: flex;
      justify-content: center;
      flex-direction: column;
      cursor: pointer;
      margin-right: 20px;

      &:last-of-type {
        margin-right: 0;
      }

      &:hover {
        &:not(.disabled) {
          .icon {
            background: #f5f5f5;
          }
        }
      }

      &.active {
        .icon {
          background: #f5f5f5;
        }
      }

      &.disabled {
        color: #bcbcbc;
        cursor: not-allowed;
        pointer-events: none;
      }

      .icon {
        display: flex;
        height: 26px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #e9e9e9;
        justify-content: center;
        flex-direction: column;
        text-align: center;
        padding: 0 5px;

        &.iconfont {
          font-size: 0;

          &::before {
            display: none;
          }

          &::after {
            content: attr(data-fallback);
            font-family: 'Segoe UI', 'PingFang SC', sans-serif;
            font-size: 12px;
            font-weight: 700;
            line-height: 1;
          }
        }
      }

      .text {
        margin-top: 3px;
      }
    }

    /deep/ .cloudMindmapDialog {
      .el-dialog__body {
        padding-top: 12px;
      }
    }
  }

  .cloudManagerHead {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .cloudManagerIntro {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: rgba(26, 26, 26, 0.72);
    line-height: 1.5;
  }

  .cloudManagerForm {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .cloudManagerLabel {
    color: rgba(26, 26, 26, 0.72);
  }

  .cloudManagerBody {
    min-height: 280px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #fafafa;
    padding: 12px;
  }

  .cloudManagerTips {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    color: rgba(26, 26, 26, 0.58);
    font-size: 12px;
  }

  .cloudFileList {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow: auto;
  }

  .cloudFileItem {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    text-align: left;
  }

  .cloudFileItem.active {
    border-color: #409eff;
    background: #ecf5ff;
  }

  .cloudFileName {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cloudFileTag {
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(64, 158, 255, 0.12);
    color: #409eff;
    font-size: 12px;
  }

  .cloudFileEmpty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    color: rgba(26, 26, 26, 0.52);
    text-align: center;
  }

  .cloudManagerFooter {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .toolbarBtnAccent {
    min-width: 72px;

    .text {
      white-space: nowrap;
      text-align: center;
    }

    .icon {
      border-color: transparent !important;
    }

    &.local .icon {
      background: #eef2ff;
      color: #3730a3;
    }

    &.cloud .icon {
      background: #ecfeff;
      color: #155e75;
    }

    &.image .icon {
      background: #fff7ed;
      color: #9a3412;
    }

    &.disabled .icon,
    &.disabled .text {
      opacity: 0.45;
    }
  }
}
</style>
