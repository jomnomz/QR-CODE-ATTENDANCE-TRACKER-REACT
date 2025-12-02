import { useState, useEffect, useRef } from 'react';

export const useRowExpansion = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const tableRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (expandedRow && tableRef.current && !tableRef.current.contains(event.target)) {
        setExpandedRow(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedRow]);

  const toggleRow = (studentId) => {
    setExpandedRow(current => current === studentId ? null : studentId);
  };

  const isRowExpanded = (studentId) => {
    return expandedRow === studentId;
  };

  const collapseAll = () => {
    setExpandedRow(null);
  };

  return {
    expandedRow,
    tableRef,
    toggleRow,
    isRowExpanded,
    collapseAll
  };
};