import { useState, useEffect, useRef, useCallback } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import { Edit } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Separator } from "@/components/ui/separator";
import NotesList from "@/components/NotesList";
import { useNostr } from "@/providers/NostrProvider";
import type { Transaction, Address, ProfileData, Chain } from "@/types";
import EditMetadataForm from "@/components/EditMetadataForm";
import TagsList from "./TagsList";
import {
  formatNumber,
  formatTimestamp,
  generateURI,
  getProfileFromNote,
} from "@/lib/utils";
import { getENSDetailsFromAddress } from "@/utils/crypto.server";
interface TransactionRowProps {
  tx: Transaction;
  chain: Chain;
  chainId: number;
}

export function TransactionRow({ tx, chain, chainId }: TransactionRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { notesByURI, subscribeToNotesByURI } = useNostr();

  // Initialize edit values when notes change or edit mode is activated
  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isEditing]);

  const getProfileForAddress = useCallback(
    (address: Address): ProfileData => {
      const uri = generateURI("ethereum", { chainId, address });
      subscribeToNotesByURI([uri]);
      const defaultProfile = {
        uri,
        address: address || undefined,
        name: "",
        about: "",
        picture: "",
        website: "",
      };
      if (!address) return defaultProfile;
      if (!notesByURI[uri]) return defaultProfile;
      const profile = getProfileFromNote(notesByURI[uri][0]);
      if (!profile) return defaultProfile;
      return profile;
    },
    [chainId, notesByURI, subscribeToNotesByURI]
  );

  const defaultFromProfile = getProfileForAddress(
    tx.from === "0x0000000000000000000000000000000000000000"
      ? tx.token.address
      : tx.from
  );
  const defaultToProfile = getProfileForAddress(
    tx.to === "0x0000000000000000000000000000000000000000"
      ? tx.token.address
      : tx.to
  );

  const [fromProfile, setFromProfile] =
    useState<ProfileData>(defaultFromProfile);
  const [toProfile, setToProfile] = useState<ProfileData>(defaultToProfile);

  useEffect(() => {
    const fetchENSDetails = async (address: Address) => {
      const ensDetails = await getENSDetailsFromAddress(address);
      if (ensDetails) {
        setFromProfile({
          uri: fromProfile.uri,
          address: tx.from,
          name: ensDetails.name,
          picture: ensDetails.avatar,
          website: ensDetails.url,
          about: ensDetails.description,
        });
      }
    };

    if (!fromProfile.name) {
      const profile = getProfileForAddress(tx.from);
      if (profile.name) {
        setFromProfile(profile);
      } else {
        fetchENSDetails(tx.from);
      }
    }
  }, [tx.from, fromProfile.name, fromProfile.uri, getProfileForAddress]);

  useEffect(() => {
    const fetchENSDetails = async (address: Address) => {
      const ensDetails = await getENSDetailsFromAddress(address);
      if (ensDetails) {
        setToProfile({
          uri: toProfile.uri,
          address: tx.to,
          name: ensDetails.name,
          picture: ensDetails.avatar,
          website: ensDetails.url,
          about: ensDetails.description,
        });
      }
    };

    if (!toProfile.name) {
      const profile = getProfileForAddress(tx.to);
      if (profile.name) {
        setToProfile(profile);
      } else {
        fetchENSDetails(tx.to);
      }
    }
  }, [tx.to, toProfile.name, toProfile.uri, getProfileForAddress]);

  if (!tx) {
    console.error("TransactionRow: tx is undefined");
    return null;
  }

  const uri = generateURI("ethereum", { chainId, txHash: tx.txHash });
  subscribeToNotesByURI([uri]);
  const lastNote = notesByURI[uri] && notesByURI[uri][0];

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <div className="space-y-4" key={tx.txHash}>
      {/* Main Transaction Info */}
      <div className="flex items-start gap-4 flex-row">
        {/* Avatars */}
        <div className="relative">
          <Avatar profile={fromProfile} editable={false} />
          <Avatar
            profile={toProfile}
            editable={false}
            className="absolute -bottom-2 -right-2 h-8 w-8 border-2 border-gray-300 bg-white"
          />
        </div>

        {/* Description and Addresses */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <EditMetadataForm
                uri={uri}
                compact={true}
                inputRef={inputRef}
                onCancel={handleCancelEdit}
                content={lastNote.content}
                tags={lastNote.tags}
              />

              {/* Timestamp is always visible */}
              <div className="flex items-center text-sm">
                <Link
                  href={`/${String(chain)}/tx/${tx.txHash}`}
                  title={formatTimestamp(
                    tx.timestamp,
                    "MMM d, yyyy 'at' HH:mm:ss zzz"
                  )}
                  className="text-muted-foreground hover:underline"
                >
                  {formatTimestamp(tx.timestamp)}
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
            <EditMetadataForm
              uri={uri}
              compact={true}
              inputRef={inputRef}
              onCancel={handleCancelEdit}
            />
          )}

          {/* Timestamp and Tags - Only show when not editing */}
          {!isEditing && (
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={`/${String(chain)}/tx/${tx.txHash}`}
                  title={formatTimestamp(
                    tx.timestamp,
                    "MMM d, yyyy 'at' HH:mm:ss zzz"
                  )}
                  className="text-muted-foreground hover:underline"
                >
                  {formatTimestamp(tx.timestamp)}
                </Link>
                <TagsList tags={lastNote?.tags} />
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="text-right">
          <div className="text-lg font-semibold">
            <span
              title={formatNumber(
                Number(ethers.formatUnits(tx.value, tx.token.decimals)),
                2,
                false
              )}
            >
              {formatNumber(
                Number(ethers.formatUnits(tx.value, tx.token.decimals))
              )}{" "}
            </span>
            <Link href={`/${String(chain)}/token/${tx.token.address}`}>
              <span className="text-sm font-normal text-muted-foreground">
                {tx.token.symbol?.substring(0, 6)}
              </span>
            </Link>
          </div>
        </div>
      </div>

      <Separator />
    </div>
  );
}
