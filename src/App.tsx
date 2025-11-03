import { useState, useEffect } from 'react'
import './App.css'

interface HistoryRecord {
  id: string
  amount: string
  timestamp: Date
  audioUrl: string
}

function App() {
  const [amount, setAmount] = useState('')
  const [formattedAmount, setFormattedAmount] = useState('')
  const [returnFormat, setReturnFormat] = useState<'audio' | 'json'>('audio')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryRecord[]>([])

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('alipayVoiceHistory')
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        // Convert timestamps back to Date objects
        const historyWithDates = parsedHistory.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp)
        }))
        setHistory(historyWithDates)
      } catch (err) {
        console.error('Error loading history:', err)
      }
    }
  }, [])

  // Format amount as user types
  useEffect(() => {
    if (amount === '') {
      setFormattedAmount('')
      return
    }

    // Remove non-numeric characters except decimal point
    const numericValue = amount.replace(/[^\d.]/g, '')
    
    // Ensure only one decimal point
    const parts = numericValue.split('.')
    const formatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 
      (parts[1] ? '.' + parts[1] : '')
    
    setFormattedAmount(formatted)
  }, [amount])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Remove formatting commas from amount
      const numericAmount = amount.replace(/,/g, '')
      
      // Validate amount
      const num = parseFloat(numericAmount)
      if (isNaN(num) || num <= 0 || num >= 100000000000) {
        throw new Error('金额范围必须在0到1000亿元之间')
      }

      // Call API
      const url = new URL('/api/alipay-voice', window.location.origin)
      url.searchParams.set('number', numericAmount)
      if (returnFormat === 'json') {
        url.searchParams.set('type', 'json')
      }

      const response = await fetch(url.toString())
      let data

      if (returnFormat === 'json') {
        data = await response.json()
        if (!response.ok) {
          throw new Error(data.msg || '请求失败')
        }
        setResult(data)
      } else {
        // For audio, we'll get a blob
        if (response.ok && response.headers.get('content-type')?.startsWith('audio/')) {
          const blob = await response.blob()
          const audioUrl = URL.createObjectURL(blob)
          data = { audiourl: audioUrl, number: numericAmount }
          setResult(data)

          // Save to history
          const newRecord: HistoryRecord = {
            id: Date.now().toString(),
            amount: numericAmount,
            timestamp: new Date(),
            audioUrl: audioUrl
          }

          const updatedHistory = [newRecord, ...history].slice(0, 10)
          setHistory(updatedHistory)
          localStorage.setItem('alipayVoiceHistory', JSON.stringify(updatedHistory))
        } else {
          const errorData = await response.json()
          throw new Error(errorData.msg || '音频生成失败')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (result?.audiourl) {
      const link = document.createElement('a')
      link.href = result.audiourl
      link.download = `alipay_voice_${result.number}.mp3`
      link.click()
    }
  }

  const handlePlayAgain = (record: HistoryRecord) => {
    setResult({ audiourl: record.audioUrl, number: record.amount })
  }

  const handleDownloadHistory = (record: HistoryRecord) => {
    const link = document.createElement('a')
    link.href = record.audioUrl
    link.download = `alipay_voice_${record.amount}_${record.timestamp.toISOString().slice(0, 10)}.mp3`
    link.click()
  }

  return (
    <div className='App'>
      <h1>支付宝收款语音生成器</h1>
      
      <form onSubmit={handleSubmit} className='form-container'>
        <div className='form-group'>
          <label htmlFor='amount'>收款金额：</label>
          <input
            type='text'
            id='amount'
            value={amount}
            onChange={handleAmountChange}
            placeholder='请输入金额'
            disabled={loading}
            className='amount-input'
          />
          {formattedAmount && (
            <div className='formatted-amount'>
              格式化：{formattedAmount}
            </div>
          )}
        </div>

        <div className='form-group'>
          <label>返回格式：</label>
          <div className='radio-group'>
            <label>
              <input
                type='radio'
                value='audio'
                checked={returnFormat === 'audio'}
                onChange={() => setReturnFormat('audio')}
                disabled={loading}
              />
              音频文件
            </label>
            <label>
              <input
                type='radio'
                value='json'
                checked={returnFormat === 'json'}
                onChange={() => setReturnFormat('json')}
                disabled={loading}
              />
              JSON数据
            </label>
          </div>
        </div>

        <button
          type='submit'
          disabled={loading || !amount}
          className='submit-button'
        >
          {loading ? '生成中...' : '生成语音'}
        </button>
      </form>

      {error && (
        <div className='error-message'>
          {error}
        </div>
      )}

      {result && (
        <div className='result-container'>
          <h2>生成结果</h2>
          
          {returnFormat === 'audio' ? (
            <div className='audio-result'>
              <audio
                src={result.audiourl}
                controls
                className='audio-player'
              >
                您的浏览器不支持音频播放。
              </think>
              <button
                onClick={handleDownload}
                className='download-button'
              >
                下载音频
              </button>
            </div>
          ) : (
            <div className='json-result'>
              <table className='json-table'>
                <tbody>
                  {Object.entries(result).map(([key, value]) => (
                    <tr key={key}>
                      <td className='key-cell'>{key}</td>
                      <td className='value-cell'>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className='history-container'>
          <h2>历史记录</h2>
          <div className='history-list'>
            {history.map((record) => (
              <div key={record.id} className='history-item'>
                <div className='history-info'>
                  <div className='history-amount'>金额：{record.amount}元</div>
                  <div className='history-time'>
                    {record.timestamp.toLocaleString()}
                  </div>
                </div>
                <div className='history-actions'>
                  <button
                    onClick={() => handlePlayAgain(record)}
                    className='action-button play-button'
                  >
                    播放
                  </button>
                  <button
                    onClick={() => handleDownloadHistory(record)}
                    className='action-button download-button'
                  >
                    下载
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App