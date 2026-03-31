import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import SettingGroup from "./SettingGroup";
import { memoServiceClient } from "@/connect";
import { State } from "@/types/proto/api/v1/common_pb";
import { timestampDate } from "@bufbuild/protobuf/wkt";

const DataExportSection = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const { memos } = await memoServiceClient.listMemos({
        state: State.NORMAL,
      });

      const exportData = memos.map((m) => ({
        id: m.name,
        content: m.content,
        createdTs: m.createTime ? timestampDate(m.createTime).getTime() : undefined,
        updatedTs: m.updateTime ? timestampDate(m.updateTime).getTime() : undefined,
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `paperslip_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Successfully exported data");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SettingGroup title="Data Export" description="Export your PaperSlip notes as a JSON file anywhere anytime.">
      <div className="flex justify-start">
        <Button onClick={handleExportJSON} disabled={isExporting}>
          <DownloadIcon className="w-5 h-5 mr-2 opacity-80" />
          Export JSON
        </Button>
      </div>
    </SettingGroup>
  );
};

export default DataExportSection;
