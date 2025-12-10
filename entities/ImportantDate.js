{
  "name": "ImportantDate",
  "type": "object",
  "properties": {
    "quarter": {
      "type": "string",
      "description": "\u5b63\u5225\uff0c\u683c\u5f0f\uff1aYYYY-QN\uff08\u5982 2025-Q1\uff09"
    },
    "title": {
      "type": "string",
      "description": "\u6d3b\u52d5\u6a19\u984c"
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "\u65e5\u671f"
    },
    "time": {
      "type": "string",
      "description": "\u6642\u9593\uff08\u9078\u586b\uff09"
    },
    "description": {
      "type": "string",
      "description": "\u8aaa\u660e\uff08\u9078\u586b\uff09"
    },
    "sort_order": {
      "type": "number",
      "description": "\u6392\u5e8f\u9806\u5e8f"
    },
    "schedule_type": {
      "type": "string",
      "description": "\u6240\u5c6c\u670d\u4e8b\u8868\u985e\u578b\uff08\u4e3b\u65e5\u3001\u9752\u5d07\u3001\u5152\u4e3b\uff09"
    }
  },
  "required": [
    "quarter",
    "title",
    "date"
  ]
}
