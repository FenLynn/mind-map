import exampleData from 'simple-mind-map/example/exampleData'
import { simpleDeepClone } from 'simple-mind-map/src/utils/index'
import Vue from 'vue'
import vuexStore from '@/store'

const SIMPLE_MIND_MAP_DATA = 'SIMPLE_MIND_MAP_DATA'
const SIMPLE_MIND_MAP_CONFIG = 'SIMPLE_MIND_MAP_CONFIG'
const SIMPLE_MIND_MAP_LANG = 'SIMPLE_MIND_MAP_LANG'
const SIMPLE_MIND_MAP_LOCAL_CONFIG = 'SIMPLE_MIND_MAP_LOCAL_CONFIG'
const MINDMAP_BRIDGE_CHANNEL = 'sci-mindmap-bridge'

let mindMapData = null
let bridgeRequestId = 0

function isEmbeddedInParent() {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

function isMindmapHostBridgeAvailable() {
  try {
    if (window.takeOverApp) return false
    if (!isEmbeddedInParent()) return false
    const params = new URLSearchParams(window.location.search)
    if (params.get('hostBridge') === 'dashboard') return true
    return Boolean(document.referrer)
  } catch {
    return false
  }
}

function requestMindmapHostBridge(action, payload = {}) {
  if (!isMindmapHostBridgeAvailable()) {
    return Promise.reject(new Error('当前页面未启用宿主桥接'))
  }
  return new Promise((resolve, reject) => {
    const requestId = `mindmap-${Date.now()}-${bridgeRequestId += 1}`
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new Error('宿主响应超时，请确认 dashboard 页面已刷新'))
    }, 12000)

    const onMessage = event => {
      const data = event.data || {}
      if (data.channel !== MINDMAP_BRIDGE_CHANNEL || data.direction !== 'response' || data.requestId !== requestId) {
        return
      }
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      if (data.ok) {
        resolve(data.result)
        return
      }
      reject(new Error(data.error || '宿主请求失败'))
    }

    window.addEventListener('message', onMessage)
    window.parent.postMessage({
      channel: MINDMAP_BRIDGE_CHANNEL,
      direction: 'request',
      requestId,
      action,
      payload
    }, '*')
  })
}

async function callMindmapBridgeWithFallback(action, payload, fallback) {
  if (isMindmapHostBridgeAvailable()) {
    try {
      return await requestMindmapHostBridge(action, payload)
    } catch (error) {
      if (!fallback) throw error
    }
  }
  if (!fallback) {
    throw new Error('当前操作不可用')
  }
  return fallback()
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片编码失败'))
    reader.readAsDataURL(blob)
  })
}

function getMindmapApiBase() {
  try {
    const urlBase = String(new URLSearchParams(window.location.search).get('apiBase') || '').trim().replace(/\/+$/, '')
    if (urlBase) return urlBase
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
  return base ? `${base}${path}` : path
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
  return callMindmapBridgeWithFallback('cloud:save', {
    filename,
    overwrite,
    content: JSON.stringify(data)
  }, async () => {
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
  })
}

export const loadCloudData = async filename => {
  const payload = await callMindmapBridgeWithFallback('cloud:load', { filename }, async () => {
    const response = await fetch(buildMindmapApiUrl(`/api/mindmap/load?filename=${encodeURIComponent(filename)}`))
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || `加载失败: ${response.status}`)
    return result
  })
  return JSON.parse(payload.content || '{}')
}

export const listCloudFiles = async () => {
  const payload = await callMindmapBridgeWithFallback('cloud:list', {}, async () => {
    const response = await fetch(buildMindmapApiUrl('/api/mindmap/list'))
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || `读取失败: ${response.status}`)
    return result
  })
  return Array.isArray(payload.files) ? payload.files : []
}

export const listCloudImages = async () => {
  const payload = await callMindmapBridgeWithFallback('cloud:list-images', {}, async () => {
    const response = await fetch(buildMindmapApiUrl('/api/mindmap/list?kind=image'))
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || `读取失败: ${response.status}`)
    return result
  })
  return Array.isArray(payload.files) ? payload.files : []
}

export const deleteCloudData = async (filename, kind = 'file') => {
  return callMindmapBridgeWithFallback('cloud:delete', { filename, kind }, async () => {
    const response = await fetch(buildMindmapApiUrl('/api/mindmap/delete'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename, kind })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || `删除失败: ${response.status}`)
    return payload
  })
}

export const uploadCloudImage = async (filename, blob, overwrite = false) => {
  return callMindmapBridgeWithFallback('cloud:upload-image', {
    filename,
    overwrite,
    dataUrl: await blobToDataUrl(blob)
  }, async () => {
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
  })
}

export { isMindmapHostBridgeAvailable, requestMindmapHostBridge }
