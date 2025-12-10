import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Pencil, X, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';

const NOTICE_SETTING_KEY = 'notice_content';
const DEFAULT_NOTICE = ``;

export default function NoticePanel({ scheduleType }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['appSettings', NOTICE_SETTING_KEY, scheduleType],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: NOTICE_SETTING_KEY, schedule_type: scheduleType }),
  });

  const noticeSetting = settings[0];
  const noticeContent = noticeSetting?.setting_value || DEFAULT_NOTICE;

  const saveMutation = useMutation({
    mutationFn: async (content) => {
      if (noticeSetting) {
        return base44.entities.AppSettings.update(noticeSetting.id, { setting_value: content });
      } else {
        return base44.entities.AppSettings.create({ 
          setting_key: NOTICE_SETTING_KEY, 
          setting_value: content,
          schedule_type: scheduleType
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings', NOTICE_SETTING_KEY, scheduleType] });
      setIsEditing(false);
    },
  });

  const handleEdit = () => {
    setEditContent(noticeContent);
    setIsEditing(true);
  };

  const handleSave = () => {
    saveMutation.mutate(editContent);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent('');
  };

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            注意事項
          </CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-7 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
            >
              <Pencil className="w-3 h-3 mr-1" />
              編輯
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[150px] text-sm bg-white"
              placeholder="支援 Markdown 格式：**粗體**、*斜體*、- 列表..."
            />
            <p className="text-xs text-amber-700">
              支援 Markdown：**粗體**、*斜體*、- 列表、1. 編號列表、--- 分隔線
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-slate-500"
              >
                <X className="w-4 h-4 mr-1" />
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Check className="w-4 h-4 mr-1" />
                儲存
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-amber-900 prose prose-sm prose-amber max-w-none
            prose-strong:text-amber-900 prose-strong:font-semibold
            prose-ul:my-1 prose-ol:my-1 prose-li:my-0
            prose-p:my-1">
            <ReactMarkdown>{noticeContent}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
