import { useState, useEffect } from "react";
import { CopyIcon } from "lucide-react";
import copy from "copy-to-clipboard";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import SettingGroup from "./SettingGroup";
import { useTranslate } from "@/utils/i18n";
import { userServiceClient } from "@/connect";
import useCurrentUser from "@/hooks/useCurrentUser";

const WriteApiSection = () => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [writeToken, setWriteToken] = useState<string>("<YOUR_ACCESS_TOKEN>");

  useEffect(() => {
    if (!currentUser?.name) return;
    // Just grab the first token to use as an example
    userServiceClient.listPersonalAccessTokens({ parent: currentUser.name }).then(({ personalAccessTokens }) => {
      if (personalAccessTokens.length > 0) {
        // We only get the token name (not the secret, which is only shown once on creation)
        // But showing the format helps users understand.
        setWriteToken("<YOUR_ACCESS_TOKEN>");
      } else {
        setWriteToken("<CREATE_TOKEN_ABOVE>");
      }
    });
  }, [currentUser?.name]);

  const origin = window.location.origin;
  const apiUrl = `${origin}/api/v1/webhook/write/${writeToken}`;

  const handleCopy = () => {
    copy(apiUrl);
    toast.success(t("setting.access-token.access-token-copied-to-clipboard"));
  };

  const curlExample = `curl -X POST ${origin}/api/v1/webhook/write/${writeToken} \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Drafting notes via PaperSlip quick API!"}'`;

  return (
    <SettingGroup title="API Webhook" description="A simple Write-Only API endpoint for quick integrations (Shortcuts, Scripts, Raycast).">
      <div className="flex flex-col gap-4 w-full">
        <p className="text-sm text-muted-foreground">
          Create a <strong>Personal Access Token</strong> in the section above, and insert it into the URL below. You can send an HTTP POST request to this URL to create a memo without needing Authorization headers.
        </p>

        <div className="bg-muted p-3 pl-4 rounded-md font-mono text-sm break-all relative group flex justify-between items-center sm:hidden">
          {apiUrl}
        </div>
        
        <div className="bg-muted p-3 pl-4 rounded-md font-mono text-sm break-all relative group hidden sm:flex justify-between items-center">
            <span>{apiUrl}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopy}>
              <CopyIcon className="h-3 w-3" />
            </Button>
        </div>

        <div>
           <p className="text-sm font-medium mb-2">Example (cURL)</p>
           <pre className="bg-muted p-3 pl-4 rounded-md font-mono text-xs overflow-x-auto whitespace-pre-wrap">
             {curlExample}
           </pre>
        </div>
      </div>
    </SettingGroup>
  );
};

export default WriteApiSection;
