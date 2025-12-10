{
  "name": "ServiceConfig",
  "type": "object",
  "properties": {
    "service_type": {
      "type": "string",
      "description": "\u670d\u4e8b\u985e\u578b\uff08\u5982\u656c\u62dc\u3001Vocal\u3001\u62db\u5f85\u7b49\uff09"
    },
    "key_workers": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "\u4e3b\u8981\u540c\u5de5 ID \u5217\u8868"
    },
    "worker_order": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "\u540c\u5de5\u986f\u793a\u9806\u5e8f\uff08\u540c\u5de5 ID \u5217\u8868\uff09"
    },
    "schedule_type": {
      "type": "string",
      "description": "\u6240\u5c6c\u670d\u4e8b\u8868\u985e\u578b\uff08\u4e3b\u65e5\u3001\u9752\u5d07\u3001\u5152\u4e3b\uff09"
    }
  },
  "required": [
    "service_type"
  ]
}
