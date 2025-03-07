import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { ethers } from "ethers";
import { format } from "date-fns";
import Link from "next/link";
import { Loader2, Edit, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import NotesList from "@/components/NotesList";
import { URI, useNostr } from "@/providers/NostrProvider";
import { Transaction } from "@/utils/crypto";
import { type Address, type TxHash } from "@/hooks/nostr";
interface TransactionRowProps {
  tx: Transaction;
  chain: string;
  chainId: number;
  expanded: boolean;
  onToggleExpand: () => void;
}

interface ProfileData {
  name: string;
  about: string;
  picture: string;
  website: string;
}

export function TransactionRow({
  tx,
  chain,
  chainId,
  expanded,
  onToggleExpand,
}: TransactionRowProps) {
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { publishNote, notesByURI } = useNostr();

  // Profile editing states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<
    Address | TxHash | undefined
  >();
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    about: "",
    picture: "",
    website: "",
  });
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Format timestamp once
  const formattedTimestamp = format(
    tx.timestamp * 1000,
    "MMM d, yyyy 'at' HH:mm"
  );

  const uri = `${chainId}:tx:${tx.txHash}` as URI;
  // Initialize edit values when notes change or edit mode is activated
  useEffect(() => {
    if (isEditing && lastNote) {
      // Get the base description
      const baseDescription = lastNote.content || "";

      // Get tags and format them as hashtags
      const tags = lastNote.tags
        .filter((t) => t[0] === "t")
        .map((t) => `#${t[1]}`);

      // Combine description and hashtags
      let fullDescription = baseDescription;

      // Only add space and hashtags if there are any tags
      if (tags.length > 0) {
        // Add a space if the description doesn't end with one
        if (fullDescription && !fullDescription.endsWith(" ")) {
          fullDescription += " ";
        }
        fullDescription += tags.join(" ");
      }

      setEditDescription(fullDescription);

      // Focus the input when entering edit mode
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isEditing, notesByURI]);

  const getDicebearUrl = (address: string) => {
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
  };

  // Extract hashtags from description and return both tags and cleaned description
  const extractHashtags = (
    text: string
  ): { tags: string[]; cleanDescription: string } => {
    // Updated regex to match hashtags with simple values, key:attr format, and floating point numbers
    const hashtagRegex = /#(\w+(?::\w+(?:\.\d+)?)?)/g;
    const matches = text.match(hashtagRegex) || [];
    const tags = matches.map((tag) => tag.substring(1)); // Remove the # symbol

    // Remove hashtags from the description
    const cleanDescription = text
      .replace(hashtagRegex, "")
      .replace(/\s+/g, " ")
      .trim();

    return { tags, cleanDescription };
  };

  const handleSubmitDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) return;

    setIsSubmitting(true);

    try {
      // Extract hashtags and clean description
      const { tags, cleanDescription } = extractHashtags(newDescription);

      await publishNote(uri, {
        content: cleanDescription,
        tags: tags.map((tag) => {
          if (tag.includes(":")) {
            return tag.split(":");
          }
          return ["t", tag];
        }),
      });

      setNewDescription("");
    } catch (error) {
      console.error("Error publishing note:", error);
      alert("Failed to publish note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDescription.trim()) return;

    setIsSubmitting(true);

    try {
      // Extract hashtags and clean description
      const { tags, cleanDescription } = extractHashtags(editDescription);

      await publish(chainId, tx.txHash, {
        description: cleanDescription,
        tags: tags,
      });

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating note:", error);
      alert("Failed to update note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditDescription("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Cancel editing when Escape key is pressed
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const openProfileModal = (address: Address) => {
    setCurrentAddress(address);
    setProfileModalOpen(true);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAddress) return;

    setIsSubmittingProfile(true);

    try {
      const uri = `${chainId}:address:${currentAddress}`.toLowerCase() as URI;
      const previousNote = notesByURI[uri][notesByURI[uri].length - 1];
      // Here you would publish the profile data to nostr
      // This is a placeholder for the actual implementation
      await publishNote(uri, {
        content: profileData.name,
        tags: [
          // Make sure we don't duplicate tags
          ...previousNote?.tags.filter(
            (t) => ["I", "picture", "website", "about"].indexOf(t[0]) === -1
          ),
          ["picture", profileData.picture],
          ["about", profileData.about],
          ["website", profileData.website],
        ],
      });

      setProfileModalOpen(false);
      // You might want to refresh the UI or notify the user of success
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const getProfileFromNotes = (address: Address): ProfileData | null => {
    if (!address) return null;
    const uri = `${chainId}:address:${address}`.toLowerCase() as URI;
    if (!notesByURI[uri]) return null;
    const profileNote = notesByURI[uri][notesByURI[uri].length - 1];
    if (profileNote) {
      return {
        name: profileNote.content || "",
        about: profileNote.tags.find((t) => t[0] === "about")?.[1] || "",
        picture: profileNote.tags.find((t) => t[0] === "picture")?.[1] || "",
        website: profileNote.tags.find((t) => t[0] === "website")?.[1] || "",
      };
    }
    return null;
  };

  const fromProfile = getProfileFromNotes(tx.from);
  const toProfile = getProfileFromNotes(tx.to);

  const lastNote =
    notesByURI[uri] && notesByURI[uri][notesByURI[uri].length - 1];

  return (
    <div className="space-y-4" key={tx.txHash}>
      {/* Main Transaction Info */}
      <div className="flex items-center gap-4 flex-row">
        {/* Avatars */}
        <div className="relative">
          <Avatar
            title={fromProfile?.name || tx.from}
            className="h-12 w-12 border-2 border-gray-300 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={() => openProfileModal(tx.from)}
          >
            <AvatarImage
              src={fromProfile?.picture || getDicebearUrl(tx.from)}
              alt={tx.from}
            />
            <AvatarFallback>{tx.from.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <Avatar
            title={toProfile?.name || tx.to}
            className="absolute -bottom-2 -right-2 h-8 w-8 border-2 border-background border-gray-300 bg-white cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={() => openProfileModal(tx.to || "")}
          >
            <AvatarImage
              src={toProfile?.picture || getDicebearUrl(tx.to)}
              alt={tx.to}
            />
            <AvatarFallback>{tx.to?.slice(0, 2) || "CT"}</AvatarFallback>
          </Avatar>
        </div>

        {/* Description and Addresses */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <form onSubmit={handleSubmitEdit}>
                <Input
                  ref={inputRef}
                  placeholder="Edit description... (use #hashtags for tags)"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleCancelEdit}
                  disabled={isSubmitting}
                  className="text-sm"
                />
                {isSubmitting && (
                  <div className="mt-1 text-xs text-muted-foreground flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Submitting...
                  </div>
                )}
              </form>

              {/* Timestamp is always visible */}
              <div className="flex items-center text-sm">
                <Link
                  href={`/${chain}/tx/${tx.txHash}`}
                  className="text-muted-foreground hover:underline"
                >
                  {formattedTimestamp}
                </Link>
              </div>
            </div>
          ) : lastNote?.content ? (
            <div className="group relative flex flex-row items-center">
              <p className="mt-1 text-sm font-bold pr-2">{lastNote.content}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-4 w-4 mt-1 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitDescription} className="mt-1">
              <Input
                placeholder="Add a description... (use #hashtags for tags)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={isSubmitting}
                className="text-sm border-none shadow-none px-0 focus:px-2"
              />
              {isSubmitting && (
                <div className="mt-1 text-xs text-muted-foreground flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Submitting...
                </div>
              )}
            </form>
          )}

          {/* Timestamp and Tags - Only show when not editing */}
          {!isEditing && (
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-4">
                <Link
                  href={`/${chain}/tx/${tx.txHash}`}
                  className="text-muted-foreground hover:underline"
                >
                  {formattedTimestamp}
                </Link>
                {lastNote?.tags.filter((t) => t[0] === "t").length > 0 && (
                  <div className="flex flex-row gap-1 group relative">
                    {lastNote.tags
                      .filter((t) => t[0] === "t")
                      .map((t) => (
                        <Tag key={t[1]} value={t[1]} />
                      ))}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="text-right">
          <div className="text-lg font-semibold">
            {Number(ethers.formatUnits(tx.value, tx.token.decimals)).toFixed(2)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {tx.token.symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Notes */}
      {expanded && (
        <div className="pl-16 border-l-2">
          <NotesList notes={notesByURI[uri]} profiles={[]} />
        </div>
      )}

      <Separator />

      {/* Profile Edit Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Edit Profile
            </DialogTitle>
            <DialogDescription>
              Update profile information for address{" "}
              {currentAddress?.slice(0, 6)}...{currentAddress?.slice(-4)}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  defaultValue={
                    getProfileFromNotes(currentAddress as Address)?.name
                  }
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="picture" className="text-right">
                  Website
                </Label>
                <Input
                  id="website"
                  defaultValue={
                    getProfileFromNotes(currentAddress as Address)?.website
                  }
                  onChange={(e) =>
                    setProfileData({ ...profileData, website: e.target.value })
                  }
                  className="col-span-3"
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="picture" className="text-right">
                  Picture URL
                </Label>
                <Input
                  id="picture"
                  defaultValue={
                    getProfileFromNotes(currentAddress as Address)?.picture
                  }
                  onChange={(e) =>
                    setProfileData({ ...profileData, picture: e.target.value })
                  }
                  className="col-span-3"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="about" className="text-right">
                  About
                </Label>
                <Textarea
                  id="about"
                  defaultValue={
                    getProfileFromNotes(currentAddress as Address)?.about
                  }
                  onChange={(e) =>
                    setProfileData({ ...profileData, about: e.target.value })
                  }
                  className="col-span-3"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfileModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingProfile}>
                {isSubmittingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
