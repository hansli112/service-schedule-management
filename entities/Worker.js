{
  "name": "Worker",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "\u540c\u5de5\u59d3\u540d"
    },
    "service_types": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "\u53ef\u53c3\u8207\u7684\u670d\u4e8b\u9805\u76ee\u5217\u8868"
    },
    "schedule_type": {
      "type": "string",
      "description": "\u6240\u5c6c\u670d\u4e8b\u8868\u985e\u578b\uff08\u4e3b\u65e5\u3001\u9752\u5d07\u3001\u5152\u4e3b\uff09"
    },
    "is_active": {
      "type": "boolean",
      "default": true,
      "description": "\u662f\u5426\u4ecd\u5728\u670d\u4e8b\u540d\u55ae\u4e2d"
    },
    "unavailable_weeks": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "\u4e0d\u53ef\u670d\u4e8b\u7684\u9031\u65e5\u671f\u5217\u8868 (yyyy-MM-dd)"
    },
    "linked_workers": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "\u7d81\u5b9a\u540c\u5de5\u7684 ID \u5217\u8868"
    },
    "min_services": {
      "type": "number",
      "description": "\u6bcf\u5b63\u6700\u5c11\u670d\u4e8b\u6b21\u6578"
    },
    "max_services": {
      "type": "number",
      "description": "\u6bcf\u5b63\u6700\u591a\u670d\u4e8b\u6b21\u6578"
    },
    "notes": {
      "type": "string",
      "description": "\u5099\u8a3b"
    }
  },
  "required": [
    "name"
  ]
}
