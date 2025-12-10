import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Link2, Calendar, User } from "lucide-react";
import { format, eachDayOfInterval, endOfMonth, getDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export default function WorkerEditor({
  open,
  onOpenChange,
  worker,
  allWorkers,
  onSave,
  isSaving,
  currentQuarter,
  scheduleType,
  availableServiceTypes = [],
}) {
  const [formData, setFormData] = useState({
    name: '',
    service_types: [],
    unavailable_weeks: [],
    linked_workers: [],
    min_services: null,
    max_services: null,
    notes: '',
  });

  useEffect(() => {
    if (open && worker) {
      setFormData({
        name: worker.name || '',
        service_types: worker.service_types || [],
        unavailable_weeks: worker.unavailable_weeks || [],
        linked_workers: worker.linked_workers || [],
        min_services: worker.min_services || null,
        max_services: worker.max_services || null,
        notes: worker.notes || '',
      });
    } else if (open) {
      setFormData({
        name: '',
        service_types: [],
        unavailable_weeks: [],
        linked_workers: [],
        min_services: null,
        max_services: null,
        notes: '',
      });
    }
  }, [open, worker]);

  // 計算當季所有主日
  const quarterSundays = useMemo(() => {
    if (!currentQuarter) return [];
    const [year, q] = currentQuarter.split('-Q');
    const quarterNum = parseInt(q);
    const startMonth = (quarterNum - 1) * 3;
    const allSundays = [];
    
    for (let i = 0; i < 3; i++) {
      const monthStart = new Date(parseInt(year), startMonth + i, 1);
      const monthEnd = endOfMonth(monthStart);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const monthSundays = days.filter(day => getDay(day) === 0);
      allSundays.push(...monthSundays);
    }
    
    return allSundays;
  }, [currentQuarter]);

  const toggleServiceType = (type) => {
    setFormData(prev => ({
      ...prev,
      service_types: prev.service_types.includes(type)
        ? prev.service_types.filter(t => t !== type)
        : [...prev.service_types, type],
    }));
  };



  const toggleUnavailableWeek = (dateStr) => {
    setFormData(prev => ({
      ...prev,
      unavailable_weeks: prev.unavailable_weeks.includes(dateStr)
        ? prev.unavailable_weeks.filter(d => d !== dateStr)
        : [...prev.unavailable_weeks, dateStr],
    }));
  };

  const toggleLinkedWorker = (workerId) => {
    setFormData(prev => ({
      ...prev,
      linked_workers: prev.linked_workers.includes(workerId)
        ? prev.linked_workers.filter(id => id !== workerId)
        : [...prev.linked_workers, workerId],
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    onSave({
      ...formData,
      name: formData.name.trim(),
      is_active: true,
    });
  };

  // 可選的綁定同工（排除自己）
  const availableLinkedWorkers = allWorkers.filter(w => 
    w.id !== worker?.id && w.is_active
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {worker ? '編輯同工' : '新增同工'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid grid-cols-3 mb-4 flex-shrink-0">
            <TabsTrigger value="basic">基本資料</TabsTrigger>
            <TabsTrigger value="unavailable">不可服事</TabsTrigger>
            <TabsTrigger value="linked">綁定同工</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 overflow-y-auto pr-4">
            <TabsContent value="basic" className="mt-0 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  姓名 *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="請輸入同工姓名"
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    最少服事次數
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.min_services || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      min_services: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    placeholder="不限制"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    最多服事次數
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.max_services || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      max_services: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    placeholder="不限制"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  備註
                </label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="備註事項..."
                  rows={3}
                />
              </div>

              {availableServiceTypes.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-3 block">
                    可負責職務
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableServiceTypes.map(type => (
                      <label
                        key={type}
                        className={`
                          flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all
                          ${formData.service_types.includes(type)
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                          }
                        `}
                      >
                        <Checkbox
                          checked={formData.service_types.includes(type)}
                          onCheckedChange={() => toggleServiceType(type)}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="unavailable" className="mt-0">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {currentQuarter} 不可服事週
                </label>
                <p className="text-xs text-slate-500 mb-4">
                  勾選無法服事的主日，一鍵安排時會自動跳過
                </p>
                
                <div className="space-y-4">
                  {[0, 1, 2].map(monthOffset => {
                    const [year, q] = (currentQuarter || '2025-Q1').split('-Q');
                    const quarterNum = parseInt(q);
                    const monthIndex = (quarterNum - 1) * 3 + monthOffset;
                    const monthDate = new Date(parseInt(year), monthIndex, 1);
                    const monthSundays = quarterSundays.filter(s => 
                      s.getMonth() === monthIndex
                    );

                    return (
                      <div key={monthOffset} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-slate-600 mb-2">
                          {format(monthDate, 'yyyy年 M月', { locale: zhTW })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {monthSundays.map(sunday => {
                            const dateStr = format(sunday, 'yyyy-MM-dd');
                            const isUnavailable = formData.unavailable_weeks.includes(dateStr);
                            return (
                              <label
                                key={dateStr}
                                className={`
                                  flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all
                                  ${isUnavailable
                                    ? 'bg-red-50 border-red-300 text-red-700'
                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                  }
                                `}
                              >
                                <Checkbox
                                  checked={isUnavailable}
                                  onCheckedChange={() => toggleUnavailableWeek(dateStr)}
                                  className="data-[state=checked]:bg-red-500"
                                />
                                <span className="text-sm">{format(sunday, 'M/d')}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="linked" className="mt-0">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  綁定同工
                </label>
                <p className="text-xs text-slate-500 mb-4">
                  選擇需要與此同工一起服事的夥伴，一鍵安排時會自動安排在同一週
                </p>

                {availableLinkedWorkers.length === 0 ? (
                  <p className="text-slate-400 text-sm py-4 text-center">
                    目前沒有其他可選的同工
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableLinkedWorkers.map(w => {
                      const isLinked = formData.linked_workers.includes(w.id);
                      return (
                        <label
                          key={w.id}
                          className={`
                            flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all
                            ${isLinked
                              ? 'bg-purple-50 border-purple-300 text-purple-700'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                            }
                          `}
                        >
                          <Checkbox
                            checked={isLinked}
                            onCheckedChange={() => toggleLinkedWorker(w.id)}
                            className="data-[state=checked]:bg-purple-500"
                          />
                          <span className="text-sm">{w.name}</span>
                          {w.service_types?.length > 0 && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {w.service_types.length} 項
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {formData.linked_workers.length > 0 && (
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700 font-medium mb-2">
                      已綁定 {formData.linked_workers.length} 位同工：
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.linked_workers.map(id => {
                        const linkedWorker = availableLinkedWorkers.find(w => w.id === id);
                        return linkedWorker ? (
                          <Badge key={id} className="bg-purple-100 text-purple-700">
                            {linkedWorker.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4 flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name.trim() || isSaving}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              worker ? '儲存變更' : '新增同工'
            )}
          </Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
  );
}
