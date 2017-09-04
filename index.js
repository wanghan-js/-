/*
1. 适配的问题，考虑换成 rem 适配
2. 把适配和 canvas 相关的代码放到 head 标签里面，看能否解决首屏加载过慢的问题
4. 点击某个 li，会自动缩放
*/


// viewport 适配
!function () {
  const targetLayoutWidth = 640
  const currentLayoutWidth = document.documentElement.clientWidth
  const scale = currentLayoutWidth / targetLayoutWidth
  const metaNode = $('meta[name="viewport"]')

  metaNode.setAttribute(
    'content',
    `initial-scale=${scale}, user-scalable=no`
  )
}()

// 阻止移动端 touchstart 默认事件
document.addEventListener('touchstart', e => e.preventDefault())

// 刮刮乐
!function () {
  const mask = $('#mask')
  mask.width = document.documentElement.clientWidth
  mask.height = document.documentElement.clientHeight
  const context = mask.getContext('2d')
  const image = new Image()
  image.src = 'image/cover.png'
  image.addEventListener('load', () => draw(image))

  function draw(image) {
    context.drawImage(image, 0, 0, mask.width, mask.height)

    mask.addEventListener('touchstart', (e) => {
      const finger = e.changedTouches[0]
      const fingerX = finger.clientX
      const fingerY = finger.clientY

      context.globalCompositeOperation = "destination-out"
      context.lineWidth = 80
      context.lineCap = "round"
      context.beginPath()
      context.moveTo(fingerX, fingerY)
      context.lineTo(fingerX + 1, fingerY + 1)
      context.stroke()
    })

    mask.addEventListener('touchmove', (e) => {
      const finger = e.changedTouches[0]
      const fingerX = finger.clientX
      const fingerY = finger.clientY
      context.lineTo(fingerX, fingerY)
      context.stroke()
    })

    mask.addEventListener('touchend', () => {
      const imageData = context.getImageData(0, 0, mask.width, mask.height)
      const totalPixel = imageData.width * imageData.height
      let count = 0

      for (let i = 0; i < totalPixel; i++) {
        if (imageData.data[4 * i + 3] === 0) {
          count++
          if (count > totalPixel / 2) {
            mask.style.opacity = 0
            // canvas 遮罩消失后才开始播放音乐
            controlMusic()
            break
          }
        }
      }
    })

    mask.addEventListener('transitionend', () => {
      mask.parentNode.removeChild(mask)
    })
  }
}()

// 控制音乐播放开关
function controlMusic() {
  const music = $('.music')
  const audio = $('audio')
  audio.play()
  music.classList.add('active')
  let playing = true
  music.addEventListener('touchstart', (e) => {
    e.stopPropagation()
    if (playing) {
      audio.pause()
      music.classList.remove('active')
      playing = false
    } else {
      audio.play()
      music.classList.add('active')
      playing = true
    }
  })
}

const list = $('.list')
const wrapper = $('.wrapper')
// 3D 加速
translate(list, 'z', 0.001)
list.innerHTML += list.innerHTML

const lis = $$('.list li')
const liHeight = document.documentElement.clientHeight
lis.forEach(li => li.style.height = liHeight + 'px')
const liNumber = lis.length

// 设置整个滚动元素 ul 的宽度为它父元素宽度（也就是视口宽度）的 N 倍，N 的值是 li（也就是图片）的个数
list.style.height = liNumber + '00%'

let index = 0
let isFirstMove
let isMovingY
let elementY
let startFingerY, endFingerY, fingerX, distanceY, startTime, endTime, timeInterval, startFingerYFixed, distanceYSoFar

wrapper.addEventListener('touchstart', function (e) {
  // 手指第一次移动的开始
  isFirstMove = true
  // 假设手指第一次是向 Y 轴移动
  isMovingY = true

  // 手指按上去的时候取消 transition 过渡动画，否则在后面的 touchmove 事件中也会触发动画
  list.style.transition = 'none'

  // 手指按上去的时间
  startTime = new Date().getTime()

  // 获取元素和手指当前的位置
  const finger = e.changedTouches[0]
  elementY = translate(list, 'y')
  startFingerY = finger.clientY
  startFingerYFixed = finger.clientY
  fingerX = finger.clientX

  // 算出当前显示的图片的索引（在所有图片中的位置）
  index = -Math.round(elementY / liHeight)

  // 如果手指按上去的是第一张图片，则瞬间切换到第二组的第一张图片
  // 如果手指按上去的是最后一张图片，则瞬间切换到第一组的最后一张图片
  // 注意要更新元素新的位置
  if (index === 0) {
    index = liNumber / 2
    elementY = -index * liHeight
    translate(list, 'y', elementY)
  } else if (index == liNumber - 1) {
    index = liNumber / 2 - 1
    elementY = -index * liHeight
    translate(list, 'y', elementY)
  }

  lis[index].classList.remove('active')
})

wrapper.addEventListener('touchmove', function (e) {
  if (!isMovingY) {
    return
  }

  const finger = e.changedTouches[0]
  endFingerY = finger.clientY
  distanceY = endFingerY - startFingerY
  const distanceX = finger.clientX - fingerX
  distanceYSoFar = Math.abs(endFingerY - startFingerYFixed)

  // 防抖动。首次移动手指的时候判断用户移动方向
  // 如果 x 轴距离大于 y 轴，则当次的所有 touchmove 都不会导致元素移动
  if (isFirstMove) {
    isFirstMove = false
    if (Math.abs(distanceY) < Math.abs(distanceX)) {
      isMovingY = false
      return
    }
  }

  // 每次 touchmove 结束时的时刻
  endTime = new Date().getTime()
  // 每次 touchmove 所花的时间
  timeInterval = endTime - startTime
  // 重置 startTime 和 startFingerX
  startTime = endTime
  startFingerY = endFingerY

  translate(list, 'y', elementY += distanceY)
  lis[index].style.transition = 'none'
  lis[index].style.transform = `scale(${1 - distanceYSoFar / (liHeight * 4)})`
})

wrapper.addEventListener('touchend', function () {
  if (!isMovingY) {
    return
  }
  // 最后一次 touchmove 的速度
  let speed = distanceY / timeInterval
  list.style.transition = '.5s'
  lis[index].style.transition = '0.5s'
  const oldIndex = index

  index = -elementY / liHeight
  log(speed)
  if (speed > 0) {
    log('向下滑')
    if (speed > 0.2 || Math.round(index) > index) {
      log('向下翻页')
      index = Math.floor(index)
      lis[oldIndex].style.transform = 'scale(0.8)'
    } else {
      log('向下不翻页')
      index = Math.ceil(index)
      lis[oldIndex].style.transform = 'scale(1)'
    }
  } else {
    log('向上滑，或者不滑动')
    if (-speed > 0.2 || Math.round(index) > index) {
      log('向上翻页')
      index = Math.ceil(index)
      lis[oldIndex].style.transform = 'scale(0.8)'
    } else {
      log('向上不翻页，或者不滑动')
      index = Math.floor(index)
      lis[oldIndex].style.transform = 'scale(1)'
    }
  }

  // 每次 touchend 后，将 distanceY 清零，这样 speed 也会重置为零
  distanceY = 0

  // 控制手动滚动不会超出边界
  if (index < 0) {
    index = 0
  } else if (index > liNumber - 1) {
    index = liNumber - 1
  }

  translate(list, 'y', -index * liHeight)

  lis[index].classList.add('active')
})

lis.forEach((li) => {
  li.addEventListener('transitionend', () => {
    li.style.transform = 'scale(1)'
  })
})










// 获取和设置元素的 translate 的工具函数
function translate(node, axis, value) {
  axis = axis.toUpperCase()
  const argumentsNumber = arguments.length

  if (!node.translates) {
    node.translates = {}
  }
  if (argumentsNumber == 2) {
    return node.translates[axis] ? node.translates[axis] : 0
  }
  if (argumentsNumber >= 3){
    let textValue = ''
    node.translates[axis] = value
    for (const item in node.translates) {
      textValue += 'translate' + item + '(' + node.translates[item] + 'px) '
    }
    node.style.transform = textValue
  }
}

// 获取元素
function $(seletor) {
  return document.querySelector(seletor)
}

function $$(seletor) {
  return Array.prototype.slice.call(document.querySelectorAll(seletor))
}

// log 测试
function log(...rest) {
  console.log(...rest)
}