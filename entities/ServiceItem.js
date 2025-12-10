{
  "name": "ServiceItem",
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "description": "\u670d\u4e8b\u9805\u76ee\u552f\u4e00\u8b58\u5225\u78bc"
    },
    "label": {
      "type": "string",
      "description": "\u670d\u4e8b\u9805\u76ee\u986f\u793a\u540d\u7a31"
    },
    "is_multiple": {
      "type": "boolean",
      "default": false,
      "description": "\u662f\u5426\u70ba\u591a\u4eba\u670d\u4e8b"
    },
    "sort_order": {
      "type": "number",
      "description": "\u6392\u5e8f\u9806\u5e8f"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "\u662f\u5426\u555f\u7528"
    },
    "schedule_type": {
      "type": "string",
      "description": "\u6240\u5c6c\u670d\u4e8b\u8868\u985e\u578b\uff08\u4e3b\u65e5\u3001\u9752\u5d07\u3001\u5152\u4e3b\uff09"
    }
  },
  "required": [
    "key",
    "label"
  ]
}
