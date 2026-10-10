import { Avatar, AvatarFallback, AvatarImage, initials } from "@/components/ui/avatar";
import { imageUrl } from "@/lib/api/images";

type PersonAvatarProps = { name: string; src?: string | null; className?: string };

/** A staff photo, or their initials until someone adds one. */
export function PersonAvatar({ name, src, className }: PersonAvatarProps) {
  const url = imageUrl(src);
  return (
    <Avatar className={className}>
      {url && <AvatarImage src={url} alt="" />}
      <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
