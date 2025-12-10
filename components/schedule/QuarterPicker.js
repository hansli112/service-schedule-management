import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function QuarterPicker({ year, quarter, onChange }) {
  const handlePrev = () => {
    if (quarter === 1) {
      onChange(year - 1, 4);
    } else {
      onChange(year, quarter - 1);
    }
  };

  const handleNext = () => {
    if (quarter === 4) {
      onChange(year + 1, 1);
    } else {
      onChange(year, quarter + 1);
    }
  };

  const quarterNames = {
    1: '第一季 (1-3月)',
    2: '第二季 (4-6月)',
    3: '第三季 (7-9月)',
    4: '第四季 (10-12月)',
  };

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrev}
        className="hover:bg-slate-100"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      
      <div className="text-center min-w-[200px]">
        <h2 className="text-2xl font-bold text-slate-800">{year} 年</h2>
        <p className="text-slate-500">{quarterNames[quarter]}</p>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        className="hover:bg-slate-100"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
