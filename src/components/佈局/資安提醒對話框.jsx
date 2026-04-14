/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STORAGE_KEY = "security_notice_confirmed";

export default function 資安提醒對話框() {
  const [開啟, set開啟] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user) return;
      const key = `${STORAGE_KEY}_${user.id || user.email}`;
      const confirmed = localStorage.getItem(key);
      if (!confirmed) {
        set開啟(true);
      }
    }).catch(() => {});
  }, []);

  const 確認 = async () => {
    const user = await base44.auth.me().catch(() => null);
    if (user) {
      const key = `${STORAGE_KEY}_${user.id || user.email}`;
      localStorage.setItem(key, "true");
    }
    set開啟(false);
  };

  return (
    <Dialog open={開啟} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            資訊安全與個人資料保護規範
          </DialogTitle>
          <p className="text-sm text-muted-foreground">使用本系統前，請詳閱以下規範事項。</p>
        </DialogHeader>

        <ScrollArea className="h-80 pr-2">
          <div className="space-y-5 text-sm leading-relaxed">
            <section>
              <h3 className="font-semibold text-base mb-2">壹、資訊安全原則</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                <li>使用者應妥善保管個人帳號與密碼，不得將帳號借予他人使用或分享密碼。</li>
                <li>密碼應定期更換（建議至少每 90 天），並符合至少 12 位元之複雜度要求。</li>
                <li>禁止於系統中上傳含有惡意程式、病毒或未經授權之軟體。</li>
                <li>存取檔案應遵循最小權限原則，僅存取業務所需之資料與文件。</li>
                <li>離開座位或長時間未操作時，應登出系統或鎖定畫面，避免未授權存取。</li>
                <li>發現資安異常事件（如帳號遭盜用、異常登入等），應立即通報系統管理員。</li>
                <li>系統操作行為均會留存稽核紀錄，以供資安事件調查之用。</li>
                <li>嚴禁嘗試繞過系統權限控制或進行未經授權之操作。</li>
              </ol>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">貳、個人資料保護原則</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                <li>本系統蒐集、處理及利用個人資料，均依據《個人資料保護法》及相關規定辦理。</li>
                <li>使用者僅得於業務必要範圍內存取他人個人資料，不得作為業務以外之用途。</li>
                <li>嚴禁擅自複製、列印、傳輸或對外揭露系統內之個人資料。</li>
                <li>含有個人資料之檔案應設定適當之存取權限，避免非授權人員取得。</li>
                <li>外包人員使用本系統時，應遵守與本機構簽訂之保密協定及個資保護條款。</li>
                <li>個人資料之蒐集應告知當事人蒐集目的與利用範圍，並取得同意。</li>
                <li>如發生個人資料外洩事件，應立即通報管理人員並配合後續調查處理。</li>
                <li>離職或業務異動時，應繳回或刪除所持有之個人資料相關檔案。</li>
              </ol>
            </section>

            <p className="text-destructive font-medium">
              違反上述規範者，將依相關法規及本機構內部規定議處。
            </p>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={確認} className="w-full sm:w-auto">
            我已閱讀並同意遵守上述規範
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}