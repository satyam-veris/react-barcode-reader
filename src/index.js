import React from 'react'

function isContentEditable(element) {
  if (typeof element.getAttribute !== 'function') {
    return false
  }

  return !!element.getAttribute('contenteditable')
}

function isInput(element) {
  if (!element) {
    return false
  }

  const { tagName } = element
  const editable = isContentEditable(element)

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || editable
}

function inIframe() {
  try {
    return window.self !== window.top
  } catch (e) {
    return true
  }
}

class BarcodeScanner extends React.Component {
  constructor(props) {
    super(props)

    this.firstCharTime = 0
    this.lastCharTime = 0
    this.stringWriting = ''
    this.callIsScanner = false
    this.testTimer = false
    this.scanButtonCounter = 0
  }

  componentDidMount() {
    if (inIframe) window.parent.document.addEventListener('keypress', this.handleKeyPress)
    window.document.addEventListener('keypress', this.handleKeyPress)
  }

  componentWillUnmount() {
    if (inIframe) window.parent.document.removeEventListener('keypress', this.handleKeyPress)
    window.document.removeEventListener('keypress', this.handleKeyPress)
  }

  initScannerDetection = () => {
    this.firstCharTime = 0
    this.stringWriting = ''
    this.scanButtonCounter = 0
  }

  scannerDetectionTest = (s) => {
    const {
      minLength, avgTimeByChar, onScanButtonLongPressed, scanButtonLongPressThreshold, onScan, onError,
    } = this.props
    // If string is given, test it
    if (s) {
      this.firstCharTime = 0
      this.lastCharTime = 0
      this.stringWriting = s
    }

    if (!this.scanButtonCounter) {
      this.scanButtonCounter = 1
    }

    // If all condition are good (length, time...), call the callback and re-initialize the plugin for next scanning
    // Else, just re-initialize
    if (this.stringWriting.length >= minLength && this.lastCharTime - this.firstCharTime < this.stringWriting.length * avgTimeByChar) {
      if (onScanButtonLongPressed && this.scanButtonCounter > scanButtonLongPressThreshold) onScanButtonLongPressed(this.stringWriting, this.scanButtonCounter)
      else if (onScan) onScan(this.stringWriting, this.scanButtonCounter)

      this.initScannerDetection()
      return true
    }

    let errorMsg = ''
    if (this.stringWriting.length < minLength) {
      errorMsg = `String length should be greater or equal ${minLength}`
    } else {
      if (this.lastCharTime - this.firstCharTime > this.stringWriting.length * avgTimeByChar) {
        errorMsg = `Average key character time should be less or equal ${avgTimeByChar}ms`
      }
    }

    if (onError) onError(this.stringWriting, errorMsg)
    this.initScannerDetection()
    return false
  }

  handleKeyPress = (e) => {
    const {
      onKeyDetect, onReceive, scanButtonKeyCode, stopPropagation, preventDefault, endChar, startChar, timeBeforeScanTest,
    } = this.props

    const { target } = e

    if (target instanceof window.HTMLElement && isInput(target)) {
      return
    }

    // If it's just the button of the scanner, ignore it and wait for the real input
    if (scanButtonKeyCode && e.which === scanButtonKeyCode) {
      this.scanButtonCounter += 1
      // Cancel default
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    // Fire keyDetect event in any case!
    if (onKeyDetect) onKeyDetect(e)

    if (stopPropagation) e.stopImmediatePropagation()
    if (preventDefault) e.preventDefault()

    if (this.firstCharTime && endChar.indexOf(e.which) !== -1) {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.callIsScanner = true
    } else if (!this.firstCharTime && startChar.indexOf(e.which) !== -1) {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.callIsScanner = false
    } else {
      if (typeof (e.which) !== 'undefined') {
        this.stringWriting += String.fromCharCode(e.which)
      }
      this.callIsScanner = false
    }

    if (!this.firstCharTime) {
      this.firstCharTime = Date.now()
    }
    this.lastCharTime = Date.now()

    if (this.testTimer) clearTimeout(this.testTimer)
    if (this.callIsScanner) {
      this.scannerDetectionTest()
      this.testTimer = false
    } else {
      this.testTimer = setTimeout(this.scannerDetectionTest, timeBeforeScanTest)
    }

    if (onReceive) onReceive(e)
  }

  render() {
    if (this.props.testCode) this.scannerDetectionTest(this.props.testCode)
    return null
  }
}

BarcodeScanner.defaultProps = {
  timeBeforeScanTest: 100,
  avgTimeByChar: 30,
  minLength: 6,
  endChar: [9, 13],
  startChar: [],
  scanButtonLongPressThreshold: 3,
  stopPropagation: false,
  preventDefault: false,
}

export default BarcodeScanner