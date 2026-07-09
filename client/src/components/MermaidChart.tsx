import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Loader2 } from 'lucide-react';

interface MermaidChartProps {
  chart: string;
}

export function MermaidChart({ chart }: MermaidChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default', // Can adjust for dark mode later
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      try {
        setError(null);
        if (!chart) return;
        
        // Clean up markdown code blocks if any
        let cleanChart = chart;
        const codeBlockMatch = cleanChart.match(/```(?:mermaid)?\n([\s\S]*?)```/);
        if (codeBlockMatch) {
          cleanChart = codeBlockMatch[1];
        } else {
          // If no markdown block, try to extract from the first recognized mermaid keyword
          const keywordMatch = cleanChart.match(/(?:graph|pie|sequenceDiagram|mindmap|classDiagram|stateDiagram|gantt|erDiagram|journey)[\s\S]*/);
          if (keywordMatch) {
            cleanChart = keywordMatch[0];
          }
        }
        
        cleanChart = cleanChart.trim();
        
        const id = `mermaid-chart-${Math.floor(Math.random() * 100000)}`;
        const { svg } = await mermaid.render(id, cleanChart);
        
        if (isMounted) {
          setSvg(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Mermaid error:", err);
          setError(err.message || 'Lỗi render sơ đồ tư duy');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-danger-50 dark:bg-danger-500/10 text-danger-600 rounded-xl border border-danger-200 text-sm">
        <p className="font-bold mb-1">Không thể vẽ sơ đồ tư duy:</p>
        <p className="whitespace-pre-wrap font-mono text-xs opacity-80">{error}</p>
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer font-medium">Xem source code</summary>
          <pre className="mt-1 p-2 bg-black/5 rounded overflow-x-auto">{chart}</pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div 
      ref={chartRef}
      className="mermaid-chart flex justify-center bg-white dark:bg-surface-800 p-4 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
