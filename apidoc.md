# 支付宝收款语音生成API

免费

通过用户输入的金额与返回模式进行生成

## 接口信息

**接口地址：** `https://api.pearktrue.cn/api/alipay/`

**请求方式：** GET

**返回格式：** JSON

## 请求参数

| 参数名 | 说明 | 必填 |
|--------|------|------|
| number | 生成的金额(超过千亿会无法返回) | 必填 |
| type | 返回格式(空为audio,输出json为json) | 可选 |

## 返回结果

| 字段名 | 说明 | 类型 |
|--------|------|------|
| code | 状态码 | 整数 |
| msg | 状态信息 | 字符串 |
| data | 返回数据 | 对象 |
| data.number | 语音金额 | 字符串 |
| data.audiourl | 音频文件链接 | 字符串 |
| api_source | API来源 | 字符串 |

## 调用示例

```bash
# 获取音频文件
GET https://api.pearktrue.cn/api/alipay/?number=1245.32

# 获取JSON格式响应
GET https://api.pearktrue.cn/api/alipay/?number=1245.32&type=json
```

## 响应示例

```json
{
  "code": 200,
  "msg": "生成成功",
  "data": {
    "number": "1245.32",
    "audiourl": "https://api.pearktrue.cn/cache/audio/2025-11-03/44750225-ad78-4c41-9ea4-abb8120486b5.mp3"
  },
  "api_source": "官方API网:https://api.pearktrue.cn/"
}
```

## 调用统计

- **总调用次数：** 53,929
- **今日调用：** 2
- **本周调用：** 90

---

*API来源：官方API网 https://api.pearktrue.cn/*
