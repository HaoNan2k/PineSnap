import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策 - PineSnap",
};

const LAST_UPDATED = "2026年1月22日";

const PRIVACY_CONTENT = `
PineSnap Inc.（“**PineSnap**”、“**我们**”或“**本公司**”）高度重视并尊重您的隐私。本隐私政策解释了当您使用 PineSnap 的服务时，我们如何收集、使用、披露和处理您的个人数据。

## 1. 我们收集的个人数据

A. **您直接提供给我们的个人数据**
* **账号信息：** 姓名、电子邮箱地址等。
* **支付信息：** 如果您使用付费服务，我们会收集您的支付信息。
* **输入和建议：** 您提交的内容和系统生成的建议。

B. **我们从您使用服务中获得的个人数据**
* **设备信息：** 设备类型、浏览器信息、IP 地址等。
* **使用数据：** 访问时间、浏览历史、交互记录等。
* **Cookies：** 我们使用 cookies 来改善您的体验。

## 2. 我们如何使用个人数据

我们可能将个人数据用于以下目的：
* 提供和维护服务。
* 改进和开发服务。
* 与您进行沟通。
* 预防欺诈和滥用。
* 遵守法律义务。

我们不会使用您的内容（Inputs）来训练我们的模型，除非您明确同意。

## 3. 我们如何共享个人数据

我们可能在以下情况下披露您的个人数据：
* **服务提供商：** 向支持我们业务的第三方供应商（如云托管、支付处理）披露。
* **法律合规：** 如有必要，向政府机构披露以遵守法律。
* **业务转移：** 在合并或收购过程中转移。

## 4. 保留

我们仅在为运营服务和满足法律要求所必需的时间内保留您的个人数据。

## 5. 安全性

我们采取合理的措施保护您的个人数据，但无法保证绝对安全。

## 6. 您的权利

根据适用法律，您可能拥有访问、删除、更正您的个人数据的权利。如需行使权利，请联系 hi@pinesnap.com。

## 7. 变更

我们可能会不时更新本隐私政策。如有重大变更，我们会通过网站通知您。

## 8. 联系我们

如对本隐私政策有任何疑问，欢迎通过 hi@pinesnap.com 与我们联系。
`;

export default function PrivacyPage() {
  return (
    <div>
      <header className="mb-12 border-b border-stone-100 pb-8">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-stone-900 mb-4 tracking-tight">隐私政策</h1>
        <p className="text-sm text-stone-500 font-medium">
          生效日期：{LAST_UPDATED}
        </p>
      </header>
      <MarkdownRenderer content={PRIVACY_CONTENT} />
    </div>
  );
}
