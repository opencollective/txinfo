import { ethers } from "ethers";
import ERC20_ABI from "../erc20.abi.json";

const cache = {};
const localStorage =
  typeof window !== "undefined"
    ? window.localStorage
    : {
        getItem: (key: string) => {
          return cache[key];
        },
        setItem: (key: string, value: string) => {
          cache[key] = value;
        },
      };
