import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, format 
} from 'date-fns';
import { Button } from "@/components/ui/button";
import { Users, Wand2, Loader2, Trash2, Download, Undo2, Redo2 } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import html2canvas from 'html2canvas';

import QuarterPicker from '@/components/schedule/QuarterPicker';
import ScheduleGrid from '@/components/schedule/ScheduleGrid';
import ExportableScheduleGrid from '@/components/schedule/ExportableScheduleGrid';
import WorkerSelector from '@/components/schedule/WorkerSelector';
import WorkerStatsPanel from '@/components/schedule/WorkerStatsPanel';
import NoticePanel from '@/components/schedule/NoticePanel';
import ImportantDatesPanel from '@/components/schedule/ImportantDatesPanel';
import TagEditor from '@/components/schedule/TagEditor';
import ScheduleWarnings from '@/components/schedule/ScheduleWarnings';
import ScheduleTypePicker from '@/components/schedule/ScheduleTypePicker';
import { SERVICE_ITEMS as DEFAULT_SERVICE_ITEMS, TAG_COLORS } from '@/components/schedule/ServiceConfig';
import { canWorkerServe, getLinkedWorkers, generateAutoScheduleWithItems } from '@/components/schedule/AutoScheduler';

export default function Schedule() {
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(currentQuarter);
  const [scheduleType, setScheduleType] = useState('主日');
  
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentEdit, setCurrentEdit] = useState(null);
  const [highlightedWorker, setHighlightedWorker] = useState(null);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [editingTagSchedule, setEditingTagSchedule] = useState(null);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [scheduleWarnings, setScheduleWarnings] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const scheduleGridRef = useRef(null);
  const exportGridRef = useRef(null);
  
  // Undo/Redo 歷史記錄
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistoryLength = 50;

  const queryClient = useQueryClient();
  const quarterKey = `${year}-Q${quarter}`;

  // 計算該季的所有主日或星期六（青崇）
  const sundays = useMemo(() => {
    const startMonth = (quarter - 1) * 3;
    const allDays = [];
    const targetDay = scheduleType === '青崇' ? 6 : 0; // 6=星期六, 0=星期日
    
    for (let i = 0; i < 3; i++) {
      const monthStart = new Date(year, startMonth + i, 1);
      const monthEnd = endOfMonth(monthStart);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const monthTargetDays = days.filter(day => getDay(day) === targetDay);
      allDays.push(...monthTargetDays);
    }
    
    return allDays;
  }, [year, quarter, scheduleType]);

  // 取得排班資料（依據服事表類型）
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', quarterKey, scheduleType],
    queryFn: () => base44.entities.Schedule.filter({ quarter: quarterKey, schedule_type: scheduleType }),
  });

  // 取得同工名單（依據服事表類型過濾）
  const { data: workers = [] } = useQuery({
    queryKey: ['workers', scheduleType],
    queryFn: () => base44.entities.Worker.filter({ is_active: true, schedule_type: scheduleType }),
  });

  // 取得重要日期（依據服事表類型）
  const { data: importantDates = [] } = useQuery({
    queryKey: ['importantDates', quarterKey, scheduleType],
    queryFn: () => base44.entities.ImportantDate.filter({ quarter: quarterKey, schedule_type: scheduleType }, 'date'),
  });

  // 取得服事設定（主要同工、順序）
  const { data: serviceConfigs = [] } = useQuery({
    queryKey: ['serviceConfigs'],
    queryFn: () => base44.entities.ServiceConfig.list(),
  });

  // 取得自訂服事項目（依據服事表類型過濾）
  const { data: allServiceItems = [] } = useQuery({
    queryKey: ['serviceItems'],
    queryFn: () => base44.entities.ServiceItem.filter({ is_active: true }, 'sort_order'),
  });
  
  const customServiceItems = useMemo(() => {
    return allServiceItems.filter(item => 
      item.schedule_type === scheduleType || !item.schedule_type
    );
  }, [allServiceItems, scheduleType]);

  // 取得注意事項（依據服事表類型）
  const { data: noticeSettings = [] } = useQuery({
    queryKey: ['appSettings', 'notice_content', scheduleType],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: 'notice_content', schedule_type: scheduleType }),
  });

  // 合併預設與自訂服事項目
  const SERVICE_ITEMS = useMemo(() => {
    return customServiceItems.map(item => ({
      key: item.key,
      label: item.label,
      serviceType: item.label,
      isMultiple: item.is_multiple || false,
    }));
  }, [customServiceItems]);

  const noticeContent = noticeSettings[0]?.setting_value || '';

  // 建立/更新排班
  const upsertMutation = useMutation({
    mutationFn: async ({ scheduleId, data }) => {
      if (scheduleId) {
        return base44.entities.Schedule.update(scheduleId, data);
      } else {
        return base44.entities.Schedule.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', quarterKey] });
    },
  });

  // 批量建立排班（保留既有，僅更新）
  const bulkCreateMutation = useMutation({
    mutationFn: async (schedulesData) => {
      // 更新或建立排班
      for (const scheduleData of schedulesData) {
        const existing = schedules.find(s => s.sunday_date === scheduleData.sunday_date);
        if (existing) {
          await base44.entities.Schedule.update(existing.id, scheduleData);
        } else {
          await base44.entities.Schedule.create(scheduleData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', quarterKey] });
      toast.success("自動排班完成", {
        description: "已成功產生整季排班表，您可以進行微調。",
      });
    },
  });

  // 取得該日期的排班
  const getScheduleForDate = (dateStr) => {
    return schedules.find(s => s.sunday_date === dateStr) || { 
      sunday_date: dateStr, 
      quarter: quarterKey,
      schedule_type: scheduleType 
    };
  };

  // 處理點擊格子
  const handleCellClick = (schedule, serviceItem) => {
    setCurrentEdit({ schedule, serviceItem });
    setSelectorOpen(true);
  };

  // 處理選擇同工
  const handleWorkerSelect = async (selected) => {
    if (!currentEdit) {
      console.error('No currentEdit found');
      return;
    }
    
    const { schedule, serviceItem } = currentEdit;
    const dateStr = schedule.sunday_date;
    const existingSchedule = schedules.find(s => s.sunday_date === dateStr);

    console.log('Saving worker:', { selected, dateStr, serviceItem: serviceItem.key });

    // 檢查不可服事週限制（跳過手動輸入的同工）
    const selectedNames = Array.isArray(selected) ? selected : (selected ? [selected] : []);
    for (const name of selectedNames) {
      // 未在資料庫的同工不做限制檢查
      const worker = workers.find(w => w.name === name);
      if (!worker) continue;

      if (!canWorkerServe(worker, dateStr)) {
        toast.error("無法安排", {
          description: `${name} 在 ${dateStr} 無法服事`,
        });
        return;
      }
    }

    // 準備排班資料
    let finalScheduleData = {
      ...schedule,
      quarter: quarterKey,
      schedule_type: scheduleType,
      [serviceItem.key]: selected,
    };

    // 如果有綁定同工，提示是否一起加入（跳過手動輸入的同工）
    if (SERVICE_ITEMS.length > 0) {
      for (const name of selectedNames) {
        const worker = workers.find(w => w.name === name);
        if (!worker) continue;
        if (worker?.linked_workers?.length > 0) {
          const linkedWorkers = getLinkedWorkers(worker, workers);
          const linkedNames = linkedWorkers.map(lw => lw.name);
          const unassignedLinked = linkedNames.filter(ln => {
            // 檢查該同工是否已在本週任何服事中
            for (const item of SERVICE_ITEMS) {
              const val = finalScheduleData[item.key];
              if (Array.isArray(val) && val.includes(ln)) return false;
              if (val === ln) return false;
            }
            return true;
          });

          if (unassignedLinked.length > 0) {
            const shouldAdd = confirm(`${name} 有綁定同工：${unassignedLinked.join(', ')}，是否一起加入本週？`);
            if (shouldAdd) {
              // 嘗試將綁定同工加入
              for (const linkedName of unassignedLinked) {
                const linkedWorker = workers.find(w => w.name === linkedName);
                if (!linkedWorker || !canWorkerServe(linkedWorker, dateStr)) continue;
                
                // 找到該同工可服事的第一個空位
                for (const item of SERVICE_ITEMS) {
                  if (!linkedWorker.service_types?.includes(item.serviceType)) continue;
                  if (item.isMultiple) {
                    const current = finalScheduleData[item.key] || [];
                    if (!current.includes(linkedName)) {
                      finalScheduleData[item.key] = [...current, linkedName];
                      break;
                    }
                  } else if (!finalScheduleData[item.key]) {
                    finalScheduleData[item.key] = linkedName;
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
    
    console.log('Final schedule data:', finalScheduleData);
    
    try {
      await upsertMutation.mutateAsync({
        scheduleId: existingSchedule?.id,
        data: finalScheduleData,
      });
      
      console.log('Save successful');
      setSelectorOpen(false);
      setCurrentEdit(null);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('儲存失敗', {
        description: error.message || '請稍後再試',
      });
    }
  };

  // 處理點擊同工名字（Highlight）
  const handleWorkerClick = (workerName) => {
    setHighlightedWorker(prev => prev === workerName ? null : workerName);
  };

  // 本地暫存排班（用於即時更新 UI）
  const [localSchedules, setLocalSchedules] = useState(null);
  
  // 使用 localSchedules 或 schedules
  const displaySchedules = localSchedules ?? schedules;

  // 當 schedules 更新時重置 localSchedules 和歷史
  React.useEffect(() => {
    setLocalSchedules(null);
    // 初始化歷史記錄
    if (schedules.length > 0 && history.length === 0) {
      setHistory([JSON.stringify(schedules)]);
      setHistoryIndex(0);
    }
  }, [schedules]);

  // 取得該日期的排班（用於顯示）
  const getDisplayScheduleForDate = useCallback((dateStr) => {
    const source = localSchedules ?? schedules;
    return source.find(s => s.sunday_date === dateStr) || { 
      sunday_date: dateStr, 
      quarter: quarterKey,
      schedule_type: scheduleType 
    };
  }, [localSchedules, schedules, quarterKey, scheduleType]);

  // 處理拖曳交換
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const sourceId = result.draggableId;
    // draggableId format: "yyyy-MM-dd|key|name|index"
    const sourceParts = sourceId.split('|');
    const sourceDate = sourceParts[0];
    const sourceKey = sourceParts[1];
    const sourceName = sourceParts[2];
    
    // droppableId format: "yyyy-MM-dd|key"
    const destParts = result.destination.droppableId.split('|');
    const destDate = destParts[0];
    const destKey = destParts[1];

    // 檢查目標欄位是否允許該同工
    const destServiceItem = SERVICE_ITEMS.find(item => item.key === destKey);
    const sourceItem = SERVICE_ITEMS.find(item => item.key === sourceKey);
    
    if (!destServiceItem || !sourceItem) return;
    
    // 手動輸入的同工（不在資料庫）可自由移動
    const worker = workers.find(w => w.name === sourceName);
    
    if (worker && !worker.service_types?.includes(destServiceItem.serviceType)) {
      toast.error("無法移動", {
        description: `${sourceName} 不在「${destServiceItem.label}」的服事名單中`,
      });
      return;
    }

    // 檢查不可服事週限制（跳過手動輸入的同工）
    if (worker && !canWorkerServe(worker, destDate)) {
      toast.error("無法移動", {
        description: `${sourceName} 在 ${destDate} 無法服事`,
      });
      return;
    }

    // 取得來源和目標的排班
    const sourceSchedule = getScheduleForDate(sourceDate);
    const destSchedule = getScheduleForDate(destDate);

    // 從來源移除
    let newSourceValue;
    if (sourceItem.isMultiple) {
      newSourceValue = (sourceSchedule[sourceKey] || []).filter(n => n !== sourceName);
    } else {
      newSourceValue = null;
    }

    // 加入目標
    let newDestValue;
    if (destServiceItem.isMultiple) {
      const currentDest = destSchedule[destKey] || [];
      if (!currentDest.includes(sourceName)) {
        newDestValue = [...currentDest, sourceName];
      } else {
        newDestValue = currentDest;
      }
    } else {
      // 單人欄位 - 交換
      const existingPerson = destSchedule[destKey];
      newDestValue = sourceName;
      
      // 如果目標已有人，移到來源
      if (existingPerson && sourceDate !== destDate) {
        // 更新來源，加入被交換的人
        if (sourceItem.isMultiple) {
          newSourceValue = [...newSourceValue, existingPerson];
        } else {
          newSourceValue = existingPerson;
        }
      }
    }

    // 立即更新本地狀態（Optimistic Update）
    const updatedSchedules = [...schedules];
    
    if (sourceDate === destDate) {
      const idx = updatedSchedules.findIndex(s => s.sunday_date === sourceDate);
      if (idx >= 0) {
        updatedSchedules[idx] = {
          ...updatedSchedules[idx],
          [sourceKey]: newSourceValue,
          [destKey]: newDestValue,
        };
      } else {
        updatedSchedules.push({
          ...sourceSchedule,
          quarter: quarterKey,
          schedule_type: scheduleType,
          [sourceKey]: newSourceValue,
          [destKey]: newDestValue,
        });
      }
    } else {
      const sourceIdx = updatedSchedules.findIndex(s => s.sunday_date === sourceDate);
      const destIdx = updatedSchedules.findIndex(s => s.sunday_date === destDate);
      
      if (sourceIdx >= 0) {
        updatedSchedules[sourceIdx] = { ...updatedSchedules[sourceIdx], [sourceKey]: newSourceValue };
      }
      if (destIdx >= 0) {
        updatedSchedules[destIdx] = { ...updatedSchedules[destIdx], [destKey]: newDestValue };
      } else {
        updatedSchedules.push({ ...destSchedule, quarter: quarterKey, schedule_type: scheduleType, [destKey]: newDestValue });
      }
    }
    
    setLocalSchedules(updatedSchedules);
    saveToHistory(updatedSchedules);

    // 更新排班（後端）
    const sourceExisting = schedules.find(s => s.sunday_date === sourceDate);
    const destExisting = schedules.find(s => s.sunday_date === destDate);

    if (sourceDate === destDate) {
      // 同一天內移動
      await upsertMutation.mutateAsync({
        scheduleId: sourceExisting?.id,
        data: {
          ...sourceSchedule,
          quarter: quarterKey,
          schedule_type: scheduleType,
          [sourceKey]: newSourceValue,
          [destKey]: newDestValue,
        },
      });
    } else {
      // 跨日期移動
      await upsertMutation.mutateAsync({
        scheduleId: sourceExisting?.id,
        data: {
          ...sourceSchedule,
          quarter: quarterKey,
          schedule_type: scheduleType,
          [sourceKey]: newSourceValue,
        },
      });
      await upsertMutation.mutateAsync({
        scheduleId: destExisting?.id,
        data: {
          ...destSchedule,
          quarter: quarterKey,
          schedule_type: scheduleType,
          [destKey]: newDestValue,
        },
      });
    }
  };

  // 處理標籤編輯
  const handleTagClick = (schedule) => {
    setEditingTagSchedule(schedule);
    setTagEditorOpen(true);
  };

  const handleTagSave = async (sundayDate, tags) => {
    const existingSchedule = schedules.find(s => s.sunday_date === sundayDate);
    const currentSchedule = getScheduleForDate(sundayDate);
    
    await upsertMutation.mutateAsync({
      scheduleId: existingSchedule?.id,
      data: {
        ...currentSchedule,
        quarter: quarterKey,
        schedule_type: scheduleType,
        special_tags: tags,
      },
    });
  };

  // 一鍵自動排班
  const handleAutoSchedule = async () => {
    setIsAutoScheduling(true);
    try {
      const result = generateAutoScheduleWithItems(sundays, workers, schedules, serviceConfigs, SERVICE_ITEMS);
      const schedulesWithQuarter = result.schedules.map(s => ({
        ...s,
        quarter: quarterKey,
        schedule_type: scheduleType,
      }));
      await bulkCreateMutation.mutateAsync(schedulesWithQuarter);
      
      // 保存到歷史記錄
      queryClient.invalidateQueries({ queryKey: ['schedules', quarterKey, scheduleType] });
      const updatedSchedules = await base44.entities.Schedule.filter({ quarter: quarterKey, schedule_type: scheduleType });
      saveToHistory(updatedSchedules);
      
      // 顯示警告
      if (result.warnings && result.warnings.length > 0) {
        setScheduleWarnings(result.warnings);
        setWarningsOpen(true);
      }
    } finally {
      setIsAutoScheduling(false);
    }
  };

  // 一鍵清除排班
  const clearMutation = useMutation({
    mutationFn: async () => {
      const existingIds = schedules.map(s => s.id);
      for (const id of existingIds) {
        await base44.entities.Schedule.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', quarterKey] });
      toast.success("已清除排班", {
        description: "本季所有排班資料已清除。",
      });
    },
  });

  const handleClearSchedule = async () => {
    if (schedules.length === 0) return;
    if (confirm('確定要清除本季所有排班資料嗎？此操作無法復原。')) {
      await clearMutation.mutateAsync();
      // 保存到歷史記錄
      saveToHistory([]);
    }
  };

  // 根據服事類型篩選同工（依照順序）
  const filteredWorkers = useMemo(() => {
    if (!currentEdit) return [];
    const serviceType = currentEdit.serviceItem.serviceType;
    const serviceConfig = serviceConfigs.find(c => c.service_type === serviceType);
    const workerOrder = serviceConfig?.worker_order || [];
    
    const serviceWorkers = workers.filter(w => 
      w.service_types?.includes(serviceType)
    );
    
    // 根據 worker_order 排序
    if (workerOrder.length > 0) {
      return [...serviceWorkers].sort((a, b) => {
        const indexA = workerOrder.indexOf(a.id);
        const indexB = workerOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    return serviceWorkers;
  }, [workers, currentEdit, serviceConfigs]);

  const handleQuarterChange = (newYear, newQuarter) => {
    setYear(newYear);
    setQuarter(newQuarter);
    setHighlightedWorker(null);
    // 切換季別時重置歷史
    setHistory([]);
    setHistoryIndex(-1);
  };
  
  const handleScheduleTypeChange = (newType) => {
    setScheduleType(newType);
    setHighlightedWorker(null);
    // 切換服事表類型時重置歷史
    setHistory([]);
    setHistoryIndex(-1);
  };
  
  // 保存歷史記錄
  const saveToHistory = useCallback((newSchedules) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.stringify(newSchedules));
      if (newHistory.length > maxHistoryLength) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, maxHistoryLength - 1));
  }, [historyIndex, maxHistoryLength]);
  
  // Undo - 僅用於 UI 顯示，不做後端操作
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const restoredSchedules = JSON.parse(history[newIndex]);
    // 保留原始 ID，僅恢復 UI 顯示
    setLocalSchedules(restoredSchedules);
  }, [history, historyIndex]);
  
  // Redo - 僅用於 UI 顯示，不做後端操作
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    const restoredSchedules = JSON.parse(history[newIndex]);
    setLocalSchedules(restoredSchedules);
  }, [history, historyIndex]);
  
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 匯出成圖片
  const handleExportImage = async () => {
    if (!exportGridRef.current) return;
    
    setIsExporting(true);
    try {
      // 等待渲染完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const element = exportGridRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: element.scrollWidth,
        height: element.scrollHeight,
      });
      
      const link = document.createElement('a');
      link.download = `${year}Q${quarter}_主日服事表.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success("匯出成功", {
        description: "排班表已下載為圖片。",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error("匯出失敗", {
        description: "無法產生圖片，請稍後再試。",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      <div className="max-w-full mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">竹圍靈糧福音中心服事表</h1>
            <p className="text-slate-500 mt-1">{quarterKey}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ScheduleTypePicker value={scheduleType} onChange={handleScheduleTypeChange} />

            <div className="h-8 w-px bg-slate-200 mx-1" />

            <Button
              variant="outline"
              size="icon"
              onClick={handleUndo}
              disabled={!canUndo}
              className="text-slate-600"
              title="復原 (Undo)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRedo}
              disabled={!canRedo}
              className="text-slate-600"
              title="重做 (Redo)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>

            <div className="h-8 w-px bg-slate-200 mx-1" />

            <Button
              onClick={handleAutoSchedule}
              disabled={isAutoScheduling || workers.length === 0 || SERVICE_ITEMS.length === 0}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 gap-2"
            >
              {isAutoScheduling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              一鍵安排
            </Button>
            <Button
              onClick={handleClearSchedule}
              disabled={clearMutation.isPending || schedules.length === 0}
              variant="outline"
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {clearMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              一鍵清除
            </Button>
            <Button 
              variant="outline" 
              className="gap-2" 
              disabled={isExporting}
              onClick={handleExportImage}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              匯出圖片
            </Button>
          </div>
        </div>

        {/* Notice & Important Dates Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <NoticePanel scheduleType={scheduleType} />
          <ImportantDatesPanel quarterKey={quarterKey} scheduleType={scheduleType} />
        </div>

        {/* Quarter Picker */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-center">
          <QuarterPicker
            year={year}
            quarter={quarter}
            onChange={handleQuarterChange}
          />
        </div>

        {/* Schedule Grid */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {schedulesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : SERVICE_ITEMS.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <p className="text-slate-500 text-lg mb-2">尚未設定服事項目</p>
              <p className="text-slate-400 text-sm mb-4">請先至「服事設定」新增服事項目</p>
              <Link to={createPageUrl('ServiceSettings')}>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  前往服事設定
                </Button>
              </Link>
            </div>
          ) : (
            <ScheduleGrid
                  sundays={sundays}
                  schedules={displaySchedules}
                  highlightedWorker={highlightedWorker}
                  onCellClick={handleCellClick}
                  onWorkerClick={handleWorkerClick}
                  onDragEnd={handleDragEnd}
                  onTagClick={handleTagClick}
                  serviceItems={SERVICE_ITEMS}
                />
          )}
        </div>

        {/* Worker Selector Dialog */}
        <WorkerSelector
          open={selectorOpen}
          onOpenChange={setSelectorOpen}
          title={currentEdit?.serviceItem.label}
          workers={filteredWorkers}
          selectedWorkers={currentEdit ? getScheduleForDate(currentEdit.schedule.sunday_date)[currentEdit.serviceItem.key] : null}
          onSelect={handleWorkerSelect}
          isMultiple={currentEdit?.serviceItem.isMultiple}
        />

        {/* Tag Editor Dialog */}
        <TagEditor
          open={tagEditorOpen}
          onOpenChange={setTagEditorOpen}
          schedule={editingTagSchedule}
          onSave={handleTagSave}
        />

        {/* Worker Stats Panel */}
        {highlightedWorker && (
          <WorkerStatsPanel
            workerName={highlightedWorker}
            schedules={displaySchedules}
            workers={workers}
            onClose={() => setHighlightedWorker(null)}
          />
        )}

        {/* Schedule Warnings Dialog */}
        <ScheduleWarnings
          open={warningsOpen}
          onOpenChange={setWarningsOpen}
          warnings={scheduleWarnings}
        />

        {/* Hidden Exportable Grid */}
        <div className="fixed left-[-9999px] top-0">
          <ExportableScheduleGrid
            ref={exportGridRef}
            sundays={sundays}
            schedules={displaySchedules}
            quarterTitle="竹圍靈糧福音中心服事表"
            subTitle={`${year} 年第 ${quarter} 季`}
            noticeContent={noticeContent}
            importantDates={importantDates}
            serviceItems={SERVICE_ITEMS}
          />
        </div>
      </div>
    </div>
  );
}
