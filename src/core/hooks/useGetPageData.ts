import { useCallback } from "react";
import { map, omit } from "lodash-es";
import { useAtomValue } from "jotai";
import { useBrandingOptions } from "./useBrandingOptions";
import { useCurrentPage } from "./useCurrentPage";
import { presentBlocksAtom } from "../atoms/blocks";
import { ChaiBlock } from "../functions/Layers";
import { splitPageBlocks } from "../functions/split-blocks";

export const useGetPageData = () => {
  const [projectOptions] = useBrandingOptions();
  const { currentPage } = useCurrentPage();
  const presentBlocks: ChaiBlock[] = useAtomValue(presentBlocksAtom);

  return useCallback(() => {
    const blocks = map(presentBlocks, (block) =>
      omit(block, ["expanded", "order", "title", "siblings", "tempClasses"]),
    );
    const [pageFilteredBlocks = [], globalBlocks = []] = splitPageBlocks(blocks);
    return {
      currentPage,
      blocks: pageFilteredBlocks,
      globalBlocks,
    };
  }, [projectOptions, currentPage, presentBlocks]);
};
