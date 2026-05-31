import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateMeeting } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Video } from "lucide-react";

export default function NewMeeting() {
  const [, setLocation] = useLocation();
  const createMutation = useCreateMeeting();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("50");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ 
      data: { 
        title, 
        description, 
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        maxParticipants: parseInt(maxParticipants)
      } 
    }, {
      onSuccess: (res) => {
        setLocation(`/meetings/${res.id}`);
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/10">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center gap-4">
        <Link href="/meetings" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">إنشاء اجتماع جديد</h1>
      </div>

      <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-6 h-6 text-primary" />
              تفاصيل الاجتماع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان الاجتماع <span className="text-destructive">*</span></Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required 
                  placeholder="مثال: مناقشة تقنيات الري الحديثة"
                  className="text-lg py-6"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف الاجتماع</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="محاور النقاش، الأهداف، أو أي معلومات إضافية..."
                  className="min-h-[120px] resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">وقت الاجتماع (اختياري)</Label>
                  <Input 
                    id="scheduledAt" 
                    type="datetime-local" 
                    value={scheduledAt} 
                    onChange={e => setScheduledAt(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground">اتركه فارغاً لبدء الاجتماع فوراً</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">الحد الأقصى للمشاركين</Label>
                  <Input 
                    id="maxParticipants" 
                    type="number" 
                    min="2" 
                    max="100" 
                    value={maxParticipants} 
                    onChange={e => setMaxParticipants(e.target.value)} 
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button type="button" variant="outline" className="flex-1 font-bold" onClick={() => setLocation('/meetings')}>
                  إلغاء
                </Button>
                <Button type="submit" className="flex-1 font-bold" disabled={!title.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء الاجتماع"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
