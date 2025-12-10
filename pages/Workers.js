import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Pencil, Trash2, User, Loader2, Link2, CalendarX } from "lucide-react";
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import WorkerEditor from '@/components/workers/WorkerEditor';
import ScheduleTypePicker from '@/components/schedule/ScheduleTypePicker';

import { SERVICE_ITEMS as DEFAULT_SERVICE_ITEMS } from '@/components/schedule/ServiceConfig';

export default function Workers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scheduleType = searchParams.get('type') || '主日';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  
  const queryClient = useQueryClient();

  // 計算當前季度
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const currentYear = new Date().getFullYear();
  const quarterKey = `${currentYear}-Q${currentQuarter}`;

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers', scheduleType],
    queryFn: () => base44.entities.Worker.filter({ is_active: true, schedule_type: scheduleType }, '-created_date'),
  });

  const { data: customServiceItems = [] } = useQuery({
    queryKey: ['serviceItems', scheduleType],
    queryFn: () => base44.entities.ServiceItem.filter({ is_active: true, schedule_type: scheduleType }, 'sort_order'),
  });

  const { data: serviceConfigs = [] } = useQuery({
    queryKey: ['serviceConfigs'],
    queryFn: () => base44.entities.ServiceConfig.list(),
  });

  // 合併預設與自訂服事項目
  const SERVICE_ITEMS = React.useMemo(() => {
    return customServiceItems.map(item => ({
      key: item.key,
      label: item.label,
      serviceType: item.label,
      isMultiple: item.is_multiple || false,
    }));
  }, [customServiceItems]);

  const SERVICE_TYPES = SERVICE_ITEMS.map(item => item.serviceType || item.label);

  // 根據 serviceConfig 的順序排序同工
  const getWorkersForService = (serviceType) => {
    const config = serviceConfigs.find(c => c.service_type === serviceType) || {};
    const serviceWorkers = workers.filter(w => w.service_types?.includes(serviceType) && w.is_active);
    
    if (config.worker_order?.length > 0) {
      return [...serviceWorkers].sort((a, b) => {
        const indexA = config.worker_order.indexOf(a.id);
        const indexB = config.worker_order.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    return serviceWorkers;
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Worker.create({ ...data, schedule_type: scheduleType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers', scheduleType] });
      setDialogOpen(false);
      setEditingWorker(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Worker.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers', scheduleType] });
      setDialogOpen(false);
      setEditingWorker(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Worker.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers', scheduleType] });
    },
  });

  const handleOpenDialog = (worker = null) => {
    setEditingWorker(worker);
    setDialogOpen(true);
  };

  const handleSaveWorker = (data) => {
    if (editingWorker) {
      updateMutation.mutate({ id: editingWorker.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (worker, serviceType = null) => {
    // 如果指定了 serviceType，只移除該職務
    if (serviceType) {
      const newServiceTypes = (worker.service_types || []).filter(t => t !== serviceType);
      updateMutation.mutate({ 
        id: worker.id, 
        data: { ...worker, service_types: newServiceTypes } 
      });
    } else {
      // 否則刪除整筆同工資料
      if (confirm(`確定要刪除「${worker.name}」嗎？`)) {
        deleteMutation.mutate(worker.id);
      }
    }
  };

  // 按服事類型分組（使用排序後的同工）
  const workersByService = SERVICE_TYPES.reduce((acc, type) => {
    acc[type] = getWorkersForService(type);
    return acc;
  }, {});

  // 沒有服事的同工
  const workersWithoutService = workers.filter(w => 
    !w.service_types || w.service_types.length === 0
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // 取得綁定同工名稱
  const getLinkedWorkerNames = (worker) => {
    if (!worker.linked_workers || worker.linked_workers.length === 0) return [];
    return worker.linked_workers
      .map(id => workers.find(w => w.id === id)?.name)
      .filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Schedule')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">同工管理</h1>
            <p className="text-slate-500 mt-1">設定各服事項目的同工名單</p>
          </div>
          <div className="flex items-center gap-3">
            <ScheduleTypePicker 
              value={scheduleType} 
              onChange={(type) => setSearchParams({ type })} 
            />
            <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="w-4 h-4" />
              新增同工
            </Button>
          </div>
        </div>

        {/* Workers by Service Type */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid gap-4">
            {/* Workers without service */}
            {workersWithoutService.length > 0 && (
              <Card className="overflow-hidden border-0 shadow-sm">
                <CardHeader className="bg-white border-b py-4">
                  <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-600" />
                    </span>
                    未設定服事
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 ml-2">
                      {workersWithoutService.length} 人
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 bg-slate-50/50">
                  <div className="flex flex-wrap gap-2">
                    {workersWithoutService.map(worker => {
                      const hasLinked = worker.linked_workers?.length > 0;
                      const hasUnavailable = worker.unavailable_weeks?.length > 0;

                      return (
                        <div
                          key={worker.id}
                          className="group flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all"
                        >
                          <span className="text-slate-700 font-medium">{worker.name}</span>
                          {hasLinked && (
                            <Link2 className="w-3 h-3 text-purple-400" />
                          )}
                          {hasUnavailable && (
                            <CalendarX className="w-3 h-3 text-red-400" />
                          )}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenDialog(worker)}
                              className="p-1 hover:bg-slate-100 rounded"
                            >
                              <Pencil className="w-3 h-3 text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(worker)}
                              className="p-1 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {SERVICE_TYPES.map(type => (
              <Card key={type} className="overflow-hidden border-0 shadow-sm">
                <CardHeader className="bg-white border-b py-4">
                  <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-600" />
                    </span>
                    {type}
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 ml-2">
                      {workersByService[type].length} 人
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 bg-slate-50/50">
                  {workersByService[type].length === 0 ? (
                    <p className="text-slate-400 text-sm py-2">尚無同工</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                          {workersByService[type].map(worker => {
                            const hasLinked = worker.linked_workers?.length > 0;
                            const hasUnavailable = worker.unavailable_weeks?.length > 0;

                            return (
                              <div
                                key={worker.id}
                                className={`
                                  group flex items-center gap-2 bg-white px-3 py-2 rounded-lg border transition-all
                                  border-slate-200
                                  hover:border-indigo-200 hover:shadow-sm
                                `}
                              >
                                <span className="text-slate-700 font-medium">{worker.name}</span>
                                {hasLinked && (
                                  <Link2 className="w-3 h-3 text-purple-400" />
                                )}
                                {hasUnavailable && (
                                  <CalendarX className="w-3 h-3 text-red-400" />
                                )}
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleOpenDialog(worker)}
                                    className="p-1 hover:bg-slate-100 rounded"
                                  >
                                    <Pencil className="w-3 h-3 text-slate-400" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(worker, type)}
                                    className="p-1 hover:bg-red-50 rounded"
                                    title="移除此職務"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-400" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Worker Editor Dialog */}
        <WorkerEditor
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          worker={editingWorker}
          allWorkers={workers}
          onSave={handleSaveWorker}
          isSaving={isSaving}
          currentQuarter={quarterKey}
          scheduleType={scheduleType}
          availableServiceTypes={SERVICE_TYPES}
        />
      </div>
    </div>
  );
}
