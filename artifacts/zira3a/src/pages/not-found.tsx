import { Link } from "wouter";
import { Leaf, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
          <Leaf className="w-10 h-10 text-primary/60" />
        </div>
        <div>
          <h1 className="text-7xl font-black text-primary/20 mb-2">404</h1>
          <h2 className="text-2xl font-bold mb-2">الصفحة غير موجودة</h2>
          <p className="text-muted-foreground">
            يبدو أن هذه الصفحة لا وجود لها. ربما تم نقلها أو حذفها.
          </p>
        </div>
        <Button asChild className="gap-2 rounded-full font-bold px-6">
          <Link href="/feed">
            <Home className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </Button>
      </div>
    </div>
  );
}
