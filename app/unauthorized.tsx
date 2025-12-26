export default function Unauthorized() {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      你尚未登录。请先前往 <a className="underline" href="/chat">/chat</a> 登录。
    </div>
  );
}


