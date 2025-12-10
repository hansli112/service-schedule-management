{
  "name": "AppSettings",
  "type": "object",
  "properties": {
    "setting_key": {
      "type": "string",
      "description": "\u8a2d\u5b9a\u9375\u540d"
    },
    "setting_value": {
      "type": "string",
      "description": "\u8a2d\u5b9a\u503c\uff08\u53ef\u70ba markdown \u6587\u5b57\uff09"
    },
    "schedule_type": {
      "type": "string",
      "description": "\u6240\u5c6c\u670d\u4e8b\u8868\u985e\u578b\uff08\u4e3b\u65e5\u3001\u9752\u5d07\u3001\u5152\u4e3b\uff09"
    }
  },
  "required": [
    "setting_key"
  ]
}
