import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WorkerSelector({
  open,
  onOpenChange,
  title,
  workers,
  selectedWorkers,
  onSelect,
  isMultiple = false,
}) {
  const [tempSelected, setTempSelected] = React.useState([]);
  const [tempWorkerName, setTempWorkerName] = React.useState('');
  const [showTempInput, setShowTempInput] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTempSelected(Array.isArray(selectedWorkers) ? selectedWorkers : selectedWorkers ? [selectedWorkers] : []);
      setTempWorkerName('');
      setShowTempInput(false);
    }
  }, [open, selectedWorkers]);

  const handleWorkerClick = (workerName) => {
    if (isMultiple) {
      setTempSelected(prev => 
        prev.includes(workerName)
          ? prev.filter(w => w !== workerName)
          : [...prev, workerName]
      );
    } else {
      onSelect(workerName);
      onOpenChange(false);
    }
  };

  const handleConfirm = () => {
    onSelect(tempSelected);
    onOpenChange(false);
  };

  const handleClear = () => {
    if (isMultiple) {
      setTempSelected([]);
    } else {
      onSelect(null);
      onOpenChange(false);
    }
  };

  const handleAddTempWorker = () => {
    const name = tempWorkerName.trim();
    if (!name) return;
    
    // 直接使用原名，不加任何標記
    const tempName = name;
    
    if (isMultiple) {
      if (!tempSelected.includes(tempName)) {
        setTempSelected(prev => [...prev, tempName]);
      }
    } else {
      onSelect(tempName);
      onOpenChange(false);
    }
    
    setTempWorkerName('');
    setShowTempInput(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-800">
            選擇{title}同工
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {isMultiple && tempSelected.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {tempSelected.map(name => (
                <Badge key={name} variant="secondary" className="bg-indigo-100 text-indigo-700">
                  {name}
                  <button
                    onClick={() => setTempSelected(prev => prev.filter(w => w !== name))}
                    className="ml-1 hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {workers.map(worker => (
                  <Button
                    key={worker.id}
                    variant="outline"
                    className={`justify-start h-auto py-3 px-4 transition-all ${
                      (isMultiple ? tempSelected : [selectedWorkers]).includes(worker.name)
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => handleWorkerClick(worker.name)}
                  >
                    <span className="truncate">{worker.name}</span>
                    {(isMultiple ? tempSelected : [selectedWorkers]).includes(worker.name) && (
                      <Check className="w-4 h-4 ml-auto text-indigo-600" />
                    )}
                  </Button>
                ))}

                {/* 手動輸入 */}
                {showTempInput ? (
                  <div className="col-span-2 flex gap-2">
                    <Input
                      value={tempWorkerName}
                      onChange={(e) => setTempWorkerName(e.target.value)}
                      placeholder="輸入同工姓名"
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTempWorker();
                        if (e.key === 'Escape') setShowTempInput(false);
                      }}
                    />
                    <Button onClick={handleAddTempWorker} size="sm" className="bg-indigo-500 hover:bg-indigo-600">
                      加入
                    </Button>
                    <Button onClick={() => setShowTempInput(false)} size="sm" variant="ghost">
                      取消
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="col-span-2 justify-center h-auto py-3 px-4 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                    onClick={() => setShowTempInput(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    手動輸入
                  </Button>
                )}
          </div>
        </div>
        
        <div className="flex justify-between pt-2 border-t">
          <Button variant="ghost" onClick={handleClear} className="text-slate-500">
            清除
          </Button>
          {isMultiple && (
            <Button onClick={handleConfirm} className="bg-indigo-600 hover:bg-indigo-700">
              確認選擇
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
