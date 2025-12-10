import { SERVICE_ITEMS as DEFAULT_SERVICE_ITEMS } from './ServiceConfig';
import { format } from 'date-fns';

export function generateAutoSchedule(sundays, workers, existingSchedules, serviceConfigs = []) {
  return generateAutoScheduleWithItems(sundays, workers, existingSchedules, serviceConfigs, DEFAULT_SERVICE_ITEMS);
}

export function generateAutoScheduleWithItems(sundays, workers, existingSchedules, serviceConfigs = [], serviceItems = DEFAULT_SERVICE_ITEMS) {
  // This function is exported for use with custom service items
  const schedules = [];
  const warnings = [];
  
  // 追蹤每位同工的服事次數
  const workerServiceCount = {};
  workers.forEach(w => {
    workerServiceCount[w.id] = { total: 0, byType: {}, lastDate: null };
  });

  // 追蹤主要同工的最後排班索引（用於輪流分配）
  const keyWorkerLastIndex = {};

  // 建立同工 ID -> 同工對象的映射
  const workerById = {};
  const workerByName = {};
  workers.forEach(w => {
    workerById[w.id] = w;
    workerByName[w.name] = w;
  });

  // Step 0: 計算現有排班的服事次數（保留既有排班）
  existingSchedules.forEach(existing => {
    serviceItems.forEach(item => {
      const value = existing[item.key];
      if (item.isMultiple && Array.isArray(value)) {
        value.forEach(name => {
          const worker = workerByName[name];
          if (worker) {
            updateWorkerStats(workerServiceCount, worker.id, item.serviceType, existing.sunday_date);
          }
        });
      } else if (value) {
        const worker = workerByName[value];
        if (worker) {
          updateWorkerStats(workerServiceCount, worker.id, item.serviceType, existing.sunday_date);
        }
      }
    });
  });

  // 為每個主日生成排班
  sundays.forEach((sunday, sundayIndex) => {
    const dateStr = format(sunday, 'yyyy-MM-dd');
    const existing = existingSchedules.find(s => s.sunday_date === dateStr);
    
    // Step 0: 保留既有排班
    const schedule = {
      sunday_date: dateStr,
      special_tags: existing?.special_tags || [],
    };

    // 追蹤本週已排班的同工（包含既有排班）
    const assignedThisSunday = new Set();
    
    // Step 0: 將既有排班的同工加入已排班集合
    if (existing) {
      serviceItems.forEach(item => {
        const value = existing[item.key];
        if (item.isMultiple && Array.isArray(value)) {
          value.forEach(name => {
            const worker = workerByName[name];
            if (worker) assignedThisSunday.add(worker.id);
          });
        } else if (value) {
          const worker = workerByName[value];
          if (worker) assignedThisSunday.add(worker.id);
        }
      });
    }

    // 追蹤本週已排入的綁定組
    const linkedGroupsAssigned = new Set();

    // Step 1-4: 為每個服事項目安排同工（僅填空白欄位）
    serviceItems.forEach(item => {
      const existingValue = existing?.[item.key];
      
      // Step 0: 檢查既有排班，保留不動
      if (item.isMultiple) {
        const existingArray = Array.isArray(existingValue) ? existingValue : [];
        if (existingArray.length > 0) {
          // 保留既有，但可能需要補足人數
          const targetCount = item.key === 'vocals' ? 3 : 2;
          if (existingArray.length >= targetCount) {
            schedule[item.key] = existingArray;
            return;
          }
          // 需要補足人數，繼續往下處理
          schedule[item.key] = [...existingArray];
        } else {
          schedule[item.key] = [];
        }
      } else {
        if (existingValue) {
          // 單人欄位已有值，保留不動
          schedule[item.key] = existingValue;
          return;
        }
      }

      // 過濾可用同工
      let eligibleWorkers = workers.filter(w => {
        if (!w.is_active) return false;
        if (!w.service_types?.includes(item.serviceType)) return false;
        // Step 1: 檢查不可服事週
        if (w.unavailable_weeks?.includes(dateStr)) return false;
        // 檢查最大服事次數限制
        if (w.max_services && workerServiceCount[w.id]?.total >= w.max_services) return false;
        return true;
      });

      if (eligibleWorkers.length === 0) {
        if (!item.isMultiple) {
          schedule[item.key] = null;
        }
        warnings.push({
          type: 'no_worker',
          date: dateStr,
          role: item.label,
          message: `${dateStr} 的「${item.label}」沒有可用同工`
        });
        return;
      }

      // Step 2: 優先安排主要同工（從 ServiceConfig 取得）
      const serviceConfig = serviceConfigs.find(c => c.service_type === item.serviceType);
      const keyWorkerIds = serviceConfig?.key_workers || [];
      const keyWorkers = eligibleWorkers.filter(w => keyWorkerIds.includes(w.id));

      if (item.isMultiple) {
        // 多人欄位（Vocal、招待）- 補足人數
        const currentArray = schedule[item.key] || [];
        // Vocal 一鍵安排只排 2 位，其他多人欄位也是 2 位
        const targetCount = 2;
        const neededCount = targetCount - currentArray.length;
        
        if (neededCount > 0) {
          // 過濾掉已在此欄位的同工
          const availableWorkers = eligibleWorkers.filter(w => 
            !currentArray.includes(w.name)
          );
          
          const selected = selectMultipleWorkersWithKeyRotation(
            availableWorkers,
            keyWorkers.filter(w => !currentArray.includes(w.name)),
            neededCount,
            assignedThisSunday,
            workerServiceCount,
            dateStr,
            item.serviceType,
            workerById,
            linkedGroupsAssigned,
            keyWorkerLastIndex,
            sundayIndex
          );
          
          schedule[item.key] = [...currentArray, ...selected.map(w => w.name)];
          selected.forEach(w => {
            assignedThisSunday.add(w.id);
            updateWorkerStats(workerServiceCount, w.id, item.serviceType, dateStr);
          });
        }
      } else {
        // 單人欄位
        const selected = selectSingleWorker(
          eligibleWorkers,
          keyWorkers,
          assignedThisSunday,
          workerServiceCount,
          dateStr,
          item.serviceType,
          workerById,
          linkedGroupsAssigned,
          keyWorkerIds
        );
        
        schedule[item.key] = selected?.name || null;
        if (selected) {
          assignedThisSunday.add(selected.id);
          updateWorkerStats(workerServiceCount, selected.id, item.serviceType, dateStr);
        }

        // Step 2: 警告 - 若沒有主要同工
        if (keyWorkerIds.length > 0 && (!selected || !keyWorkerIds.includes(selected.id))) {
          warnings.push({
            type: 'no_key_worker',
            date: dateStr,
            role: item.label,
            message: `${dateStr} 的「${item.label}」未安排主要同工`
          });
        }
      }
    });

    // Step 3: 處理綁定同工組 - 確保同組成員在同一週
    handleLinkedWorkers(schedule, assignedThisSunday, workers, workerById, dateStr, workerServiceCount, workerByName, serviceItems);

    schedules.push(schedule);
  });

  // 檢查最少服事次數警告
  workers.forEach(w => {
    if (w.min_services && workerServiceCount[w.id]?.total < w.min_services) {
      warnings.push({
        type: 'below_min',
        worker: w.name,
        message: `${w.name} 本季服事 ${workerServiceCount[w.id]?.total || 0} 次，低於最低要求 ${w.min_services} 次`
      });
    }
  });

  return { schedules, warnings };
}

function selectSingleWorker(workers, keyWorkers, assignedThisSunday, serviceCount, currentDate, serviceType, workerById, linkedGroupsAssigned, keyWorkerIds = []) {
  // 優先選擇主要同工
  let candidates = keyWorkers.length > 0 ? keyWorkers : workers;
  
  // 過濾掉本週已有服事的同工（Step 4: 避免一人擔任多項職務）
  let available = candidates.filter(w => !assignedThisSunday.has(w.id));
  
  if (available.length === 0) {
    available = candidates; // 如果所有人都排過了，放寬限制
  }

  // Step 4: 按優先級排序
  available.sort((a, b) => {
    // 1. 主要同工優先
    const aIsKey = keyWorkerIds.includes(a.id);
    const bIsKey = keyWorkerIds.includes(b.id);
    if (aIsKey && !bIsKey) return -1;
    if (!aIsKey && bIsKey) return 1;

    // 2. 服事次數少的優先（平均分配）
    const countA = serviceCount[a.id]?.byType[serviceType] || 0;
    const countB = serviceCount[b.id]?.byType[serviceType] || 0;
    if (countA !== countB) return countA - countB;

    // 3. 避免連續排班
    const lastA = serviceCount[a.id]?.lastDate;
    const lastB = serviceCount[b.id]?.lastDate;
    if (lastA && !lastB) return 1;
    if (!lastA && lastB) return -1;
    if (lastA && lastB) {
      const diffA = new Date(currentDate) - new Date(lastA);
      const diffB = new Date(currentDate) - new Date(lastB);
      return diffB - diffA;
    }

    // 4. 總服事次數少的優先
    const totalA = serviceCount[a.id]?.total || 0;
    const totalB = serviceCount[b.id]?.total || 0;
    return totalA - totalB;
  });

  return available[0] || null;
}

function selectMultipleWorkers(workers, keyWorkers, targetCount, assignedThisSunday, serviceCount, currentDate, serviceType, workerById, linkedGroupsAssigned) {
  const selected = [];

  // 優先選擇主要同工
  const sortedKeyWorkers = [...keyWorkers].sort((a, b) => {
    const countA = serviceCount[a.id]?.total || 0;
    const countB = serviceCount[b.id]?.total || 0;
    return countA - countB;
  });

  // 先選主要同工
  for (const kw of sortedKeyWorkers) {
    if (selected.length >= targetCount) break;
    if (!assignedThisSunday.has(kw.id) && !selected.find(s => s.id === kw.id)) {
      selected.push(kw);
    }
  }

  // 再選其他同工
  const remaining = workers.filter(w => 
    !selected.find(s => s.id === w.id) && 
    !assignedThisSunday.has(w.id)
  ).sort((a, b) => {
    const countA = serviceCount[a.id]?.total || 0;
    const countB = serviceCount[b.id]?.total || 0;
    return countA - countB;
  });

  for (const w of remaining) {
    if (selected.length >= targetCount) break;
    selected.push(w);
  }

  return selected;
}

// 新的多人選擇函數：主要同工輪流，每週只選一位主要同工
function selectMultipleWorkersWithKeyRotation(workers, keyWorkers, targetCount, assignedThisSunday, serviceCount, currentDate, serviceType, workerById, linkedGroupsAssigned, keyWorkerLastIndex, sundayIndex) {
  const selected = [];
  
  // 主要同工輪流：每週只選一位主要同工
  if (keyWorkers.length > 0) {
    // 初始化該服事類型的輪流索引
    if (keyWorkerLastIndex[serviceType] === undefined) {
      keyWorkerLastIndex[serviceType] = -1;
    }
    
    // 找出可用的主要同工（未被排入本週的）
    const availableKeyWorkers = keyWorkers.filter(kw => !assignedThisSunday.has(kw.id));
    
    if (availableKeyWorkers.length > 0) {
      // 輪流選擇下一位主要同工
      const nextIndex = (keyWorkerLastIndex[serviceType] + 1) % keyWorkers.length;
      
      // 找到下一個可用的主要同工
      let selectedKeyWorker = null;
      for (let i = 0; i < keyWorkers.length; i++) {
        const idx = (nextIndex + i) % keyWorkers.length;
        const kw = keyWorkers[idx];
        if (!assignedThisSunday.has(kw.id)) {
          selectedKeyWorker = kw;
          keyWorkerLastIndex[serviceType] = idx;
          break;
        }
      }
      
      if (selectedKeyWorker) {
        selected.push(selectedKeyWorker);
      }
    }
  }

  // 再選其他同工補足人數
  const remaining = workers.filter(w => 
    !selected.find(s => s.id === w.id) && 
    !assignedThisSunday.has(w.id) &&
    !keyWorkers.find(kw => kw.id === w.id) // 排除其他主要同工
  ).sort((a, b) => {
    const countA = serviceCount[a.id]?.total || 0;
    const countB = serviceCount[b.id]?.total || 0;
    return countA - countB;
  });

  for (const w of remaining) {
    if (selected.length >= targetCount) break;
    selected.push(w);
  }

  return selected;
}

function handleLinkedWorkers(schedule, assignedThisSunday, workers, workerById, dateStr, serviceCount, workerByName, serviceItems = DEFAULT_SERVICE_ITEMS) {
  // 找出本週已排班的同工中有綁定關係的
  const assignedWorkers = workers.filter(w => assignedThisSunday.has(w.id));
  
  assignedWorkers.forEach(worker => {
    if (!worker.linked_workers || worker.linked_workers.length === 0) return;
    
    worker.linked_workers.forEach(linkedId => {
      const linkedWorker = workerById[linkedId];
      if (!linkedWorker || assignedThisSunday.has(linkedId)) return;
      if (linkedWorker.unavailable_weeks?.includes(dateStr)) return;
      // 檢查最大服事次數
      if (linkedWorker.max_services && serviceCount[linkedId]?.total >= linkedWorker.max_services) return;
      
      // 嘗試將綁定同工加入同一週
      for (const item of serviceItems) {
        if (!linkedWorker.service_types?.includes(item.serviceType)) continue;
        if (assignedThisSunday.has(linkedId)) break;
        
        if (item.isMultiple) {
          const current = schedule[item.key] || [];
          if (!current.includes(linkedWorker.name)) {
            schedule[item.key] = [...current, linkedWorker.name];
            assignedThisSunday.add(linkedId);
            updateWorkerStats(serviceCount, linkedId, item.serviceType, dateStr);
            break;
          }
        } else if (!schedule[item.key]) {
          schedule[item.key] = linkedWorker.name;
          assignedThisSunday.add(linkedId);
          updateWorkerStats(serviceCount, linkedId, item.serviceType, dateStr);
          break;
        }
      }
    });
  });
}

function updateWorkerStats(serviceCount, workerId, serviceType, date) {
  if (!serviceCount[workerId]) {
    serviceCount[workerId] = { total: 0, byType: {}, lastDate: null };
  }
  serviceCount[workerId].total++;
  serviceCount[workerId].byType[serviceType] = (serviceCount[workerId].byType[serviceType] || 0) + 1;
  serviceCount[workerId].lastDate = date;
}

// 檢查同工是否可在指定日期服事
export function canWorkerServe(worker, dateStr) {
  if (!worker.is_active) return false;
  if (worker.unavailable_weeks?.includes(dateStr)) return false;
  return true;
}

// 取得同工的綁定夥伴
export function getLinkedWorkers(worker, allWorkers) {
  if (!worker.linked_workers || worker.linked_workers.length === 0) return [];
  return allWorkers.filter(w => worker.linked_workers.includes(w.id));
}
