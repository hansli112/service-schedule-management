import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, GripVertical, Star, Loader2, Plus, Trash2 } from "lucide-react";
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { SERVICE_ITEMS as DEFAULT_SERVICE_ITEMS } from '@/components/schedule/ServiceConfig';
import ScheduleTypePicker from '@/components/schedule/ScheduleTypePicker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ServiceSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scheduleType = searchParams.get('type') || '主日';
  const [selectedService, setSelectedService] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newService, setNewService] = useState({ label: '', is_multiple: false });
  const queryClient = useQueryClient();

  const { data: workers = [], isLoading: workersLoading } = useQuery({
    queryKey: ['workers', scheduleType],
    queryFn: () => base44.entities.Worker.filter({ is_active: true, schedule_type: scheduleType }, '-created_date'),
  });

  const { data: serviceConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['serviceConfigs', scheduleType],
    queryFn: () => base44.entities.ServiceConfig.filter({ schedule_type: scheduleType }),
  });

  const { data: customServiceItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['serviceItems', scheduleType],
    queryFn: () => base44.entities.ServiceItem.filter({ is_active: true, schedule_type: scheduleType }, 'sort_order'),
  });

  // 合併預設與自訂服事項目
  const SERVICE_ITEMS = useMemo(() => {
    if (customServiceItems.length === 0) return DEFAULT_SERVICE_ITEMS;
    return customServiceItems.map(item => ({
      key: item.key,
      label: item.label,
      serviceType: item.label,
      isMultiple: item.is_multiple || false,
      id: item.id,
    }));
  }, [customServiceItems]);

  const upsertConfigMutation = useMutation({
    mutationFn: async ({ serviceType, data }) => {
      const existing = serviceConfigs.find(c => c.service_type === serviceType);
      if (existing) {
        return base44.entities.ServiceConfig.update(existing.id, data);
      } else {
        return base44.entities.ServiceConfig.create({ service_type: serviceType, schedule_type: scheduleType, ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceConfigs', scheduleType] });
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (data) => {
      const maxOrder = customServiceItems.length > 0 
        ? Math.max(...customServiceItems.map(i => i.sort_order || 0)) 
        : DEFAULT_SERVICE_ITEMS.length;
      return base44.entities.ServiceItem.create({
        key: data.label.toLowerCase().replace(/\s+/g, '_'),
        label: data.label,
        is_multiple: data.is_multiple,
        schedule_type: scheduleType,
        sort_order: maxOrder + 1,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceItems', scheduleType] });
      setAddDialogOpen(false);
      setNewService({ label: '', is_multiple: false });
      toast.success("服事項目已新增");
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceItem.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceItems', scheduleType] });
      toast.success("服事項目已刪除");
    },
  });

  const getConfigForService = (serviceType) => {
    return serviceConfigs.find(c => c.service_type === serviceType) || {};
  };

  const getWorkersForService = (serviceType) => {
    const config = getConfigForService(serviceType);
    const serviceWorkers = workers.filter(w => 
      w.is_active && w.service_types?.includes(serviceType)
    );
    
    // 根據 worker_order 排序
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

  const handleDragEnd = async (result) => {
    if (!result.destination || !selectedService) return;
    
    const serviceWorkers = getWorkersForService(selectedService);
    const newOrder = [...serviceWorkers];
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    
    const workerOrder = newOrder.map(w => w.id);
    const config = getConfigForService(selectedService);
    
    await upsertConfigMutation.mutateAsync({
      serviceType: selectedService,
      data: {
        ...config,
        worker_order: workerOrder,
      },
    });
    
    toast.success("順序已更新");
  };

  const toggleKeyWorker = async (workerId) => {
    if (!selectedService) return;
    
    const config = getConfigForService(selectedService);
    const currentKeyWorkers = config.key_workers || [];
    
    const newKeyWorkers = currentKeyWorkers.includes(workerId)
      ? currentKeyWorkers.filter(id => id !== workerId)
      : [...currentKeyWorkers, workerId];
    
    await upsertConfigMutation.mutateAsync({
      serviceType: selectedService,
      data: {
        ...config,
        key_workers: newKeyWorkers,
      },
    });
  };

  const isKeyWorker = (workerId) => {
    if (!selectedService) return false;
    const config = getConfigForService(selectedService);
    return config.key_workers?.includes(workerId) || false;
  };

  const handleAddService = () => {
    if (!newService.label.trim()) return;
    addServiceMutation.mutate(newService);
  };

  const handleDeleteService = (item) => {
    if (!item.id) {
      toast.error("預設服事項目無法刪除");
      return;
    }
    if (confirm(`確定要刪除「${item.label}」嗎？`)) {
      deleteServiceMutation.mutate(item.id);
    }
  };

  const isLoading = workersLoading || configsLoading || itemsLoading;

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
            <h1 className="text-3xl font-bold text-slate-800">服事項目設定</h1>
            <p className="text-slate-500 mt-1">設定各服事的主要同工與同工順序</p>
          </div>
          <div className="flex items-center gap-3">
            <ScheduleTypePicker 
              value={scheduleType} 
              onChange={(type) => setSearchParams({ type })} 
            />
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              新增服事
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Service List */}
            <div className="md:col-span-1">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">服事項目</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {SERVICE_ITEMS.map(item => {
                    const serviceWorkers = getWorkersForService(item.serviceType || item.label);
                    const config = getConfigForService(item.serviceType || item.label);
                    const keyCount = config.key_workers?.length || 0;
                    
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center gap-2 ${
                          selectedService === (item.serviceType || item.label)
                            ? 'bg-indigo-100'
                            : 'hover:bg-slate-100'
                        } rounded-lg transition-all`}
                      >
                        <button
                          onClick={() => setSelectedService(item.serviceType || item.label)}
                          className="flex-1 text-left px-3 py-2.5 flex items-center justify-between"
                        >
                          <span className={`font-medium ${
                            selectedService === (item.serviceType || item.label)
                              ? 'text-indigo-700'
                              : ''
                          }`}>{item.label}</span>
                          <div className="flex items-center gap-2">
                            {keyCount > 0 && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                {keyCount}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
                              {serviceWorkers.length}人
                            </Badge>
                          </div>
                        </button>
                        {item.id && (
                          <button
                            onClick={() => handleDeleteService(item)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg mr-1"
                            title="刪除服事項目"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Worker Order & Key Workers */}
            <div className="md:col-span-2">
              {selectedService ? (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {SERVICE_ITEMS.find(i => (i.serviceType || i.label) === selectedService)?.label}
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 ml-2">
                        {getWorkersForService(selectedService).length} 位同工
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      拖曳調整順序，點擊星號設定主要同工
                    </p>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="workers">
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="space-y-2"
                          >
                            {getWorkersForService(selectedService).map((worker, index) => (
                              <Draggable 
                                key={worker.id} 
                                draggableId={worker.id} 
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                      snapshot.isDragging
                                        ? 'shadow-lg bg-white border-indigo-300'
                                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    <div
                                      {...provided.dragHandleProps}
                                      className="text-slate-400 hover:text-slate-600 cursor-grab"
                                    >
                                      <GripVertical className="w-5 h-5" />
                                    </div>
                                    
                                    <span className="text-sm text-slate-500 w-6">
                                      {index + 1}.
                                    </span>
                                    
                                    <span className="flex-1 font-medium text-slate-700">
                                      {worker.name}
                                    </span>
                                    
                                    <button
                                      onClick={() => toggleKeyWorker(worker.id)}
                                      disabled={upsertConfigMutation.isPending}
                                      className={`p-1.5 rounded-full transition-all ${
                                        isKeyWorker(worker.id)
                                          ? 'bg-amber-100 text-amber-600'
                                          : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'
                                      }`}
                                    >
                                      <Star 
                                        className={`w-5 h-5 ${isKeyWorker(worker.id) ? 'fill-current' : ''}`} 
                                      />
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    {getWorkersForService(selectedService).length === 0 && (
                      <p className="text-center text-slate-400 py-8">
                        此服事項目尚無同工
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-20 text-center text-slate-400">
                    請從左側選擇一個服事項目
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Add Service Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新增服事項目</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  服事名稱
                </label>
                <Input
                  value={newService.label}
                  onChange={(e) => setNewService(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="例如：攝影、茶水服務..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_multiple"
                  checked={newService.is_multiple}
                  onCheckedChange={(checked) => setNewService(prev => ({ ...prev, is_multiple: checked }))}
                />
                <label htmlFor="is_multiple" className="text-sm text-slate-700">
                  多人服事（如 Vocal、招待）
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleAddService}
                disabled={!newService.label.trim() || addServiceMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {addServiceMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                新增
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
