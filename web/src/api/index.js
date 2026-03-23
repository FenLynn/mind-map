import exampleData from 'simple-mind-map/example/exampleData'
import { simpleDeepClone } from 'simple-mind-map/src/utils/index'
import Vue from 'vue'
import vuexStore from '@/store'

const SIMPLE_MIND_MAP_DATA = 'SIMPLE_MIND_MAP_DATA'
const SIMPLE_MIND_MAP_CONFIG = 'SIMPLE_MIND_MAP_CONFIG'
const SIMPLE_MIND_MAP_LANG = 'SIMPLE_MIND_MAP_LANG'
const SIMPLE_MIND_MAP_LOCAL_CONFIG = 'SIMPLE_MIND_MAP_LOCAL_CONFIG'

let mindMapData = null

function getMindmapApiBase() {
  try {
    const override = String(localStorage.getItem('mindmap_api_base') || '').trim().replace(/\/+$/, '')
    if (override) return override
    const referrerOrigin = document.referrer ? new URL(document.referrer).origin : ''
    if (referrerOrigin) return referrerOrigin
    return window.location.origin
  } catch {
    return ''
  }
}

function buildMindmapApiUrl(path) {
  const base = getMindmapApiBase()
  return `${base}${path}`
}

// 获取缓存的思维导图数据
export const getData = () => {
  // 接管模式
  if (window.takeOverApp) {
    mindMapData = window.takeOverAppMethods.getMindMapData()
    return mindMapData
  }
  // 操作本地文件模式
  if (vuexStore.state.isHandleLocalFile) {
    return Vue.prototype.getCurrentData()
  }
  let store = localStorage.getItem(SIMPLE_MIND_MAP_DATA)
  if (store === null) {
    return simpleDeepClone(exampleData)
  } else {
    try {
      return JSON.parse(store)
    } catch (error) {
      return simpleDeepClone(exampleData)
    }
  }
}

// 存储思维导图数据
export const storeData = data => {
  try {
    let originData = null
    if (window.takeOverApp) {
      originData = mindMapData
    } else {
      originData = getData()
    }
    if (!originData) {
      originData = {}
    }
    originData = {
      ...originData,
      ...data
    }
    if (window.takeOverApp) {
      mindMapData = originData
      window.takeOverAppMethods.saveMindMapData(originData)
      return
    }
    Vue.prototype.$bus.$emit('write_local_file', originData)
    if (vuexStore.state.isHandleLocalFile) {
      return
    }
    localStorage.setItem(SIMPLE_MIND_MAP_DATA, JSON.stringify(originData))
  } catch (error) {
    console.log(error)
    if ('exceeded') {
      Vue.prototype.$bus.$emit('localStorageExceeded')
    }
  }
}

// 获取思维导图配置数据
export const getConfig = () => {
  if (window.takeOverApp) {
    window.takeOverAppMethods.getMindMapConfig()
    return
  }
  let config = localStorage.getItem(SIMPLE_MIND_MAP_CONFIG)
  if (config) {
    return JSON.parse(config)
  }
  return null
}

// 存储思维导图配置数据
export const storeConfig = config => {
  try {
    if (window.takeOverApp) {
      window.takeOverAppMethods.saveMindMapConfig(config)
      return
    }
    localStorage.setItem(SIMPLE_MIND_MAP_CONFIG, JSON.stringify(config))
  } catch (error) {
    console.log(error)
  }
}

// 存储语言
export const storeLang = lang => {
  if (window.takeOverApp) {
    window.takeOverAppMethods.saveLanguage(lang)
    return
  }
  localStorage.setItem(SIMPLE_MIND_MAP_LANG, lang)
}

// 获取存储的语言
export const getLang = () => {
  if (window.takeOverApp) {
    return window.takeOverAppMethods.getLanguage() || 'zh'
  }
  let lang = localStorage.getItem(SIMPLE_MIND_MAP_LANG)
  if (lang) {
    return lang
  }
  storeLang('zh')
  return 'zh'
}

// 存储本地配置
export const storeLocalConfig = config => {
  if (window.takeOverApp) {
    return window.takeOverAppMethods.saveLocalConfig(config)
  }
  localStorage.setItem(SIMPLE_MIND_MAP_LOCAL_CONFIG, JSON.stringify(config))
}

// 获取本地配置
export const getLocalConfig = () => {
  if (window.takeOverApp) {
    return window.takeOverAppMethods.getLocalConfig()
  }
  let config = localStorage.getItem(SIMPLE_MIND_MAP_LOCAL_CONFIG)
  if (config) {
    return JSON.parse(config)
  }
  return null
}

export const saveCloudData = async (filename, data, overwrite = false) => {
  const response = await fetch(buildMindmapApiUrl('/api/mindmap/save'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename,
      overwrite,
      content: JSON.stringify(data)
    })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `保存失败: ${response.status}`)
  return payload
}

export const loadCloudData = async filename => {
  const response = await fetch(buildMindmapApiUrl(`/api/mindmap/load?filename=${encodeURIComponent(filename)}`))
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `加载失败: ${response.status}`)
  return JSON.parse(payload.content || '{}')
}

export const listCloudFiles = async () => {
  const response = await fetch(buildMindmapApiUrl('/api/mindmap/list'))
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `读取失败: ${response.status}`)
  return Array.isArray(payload.files) ? payload.files : []
}

export const deleteCloudData = async filename => {
  const response = await fetch(buildMindmapApiUrl('/api/mindmap/delete'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filename })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `删除失败: ${response.status}`)
  return payload
}

export const uploadCloudImage = async (filename, blob, overwrite = false) => {
  const formData = new FormData()
  formData.append('filename', filename)
  formData.append('overwrite', String(overwrite))
  formData.append('file', blob, String(filename || 'mindmap.png').replace(/\.smm$/i, '.png'))
  const response = await fetch(buildMindmapApiUrl('/api/mindmap/upload-image'), {
    method: 'POST',
    body: formData
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `图片上传失败: ${response.status}`)
  return payload
}
