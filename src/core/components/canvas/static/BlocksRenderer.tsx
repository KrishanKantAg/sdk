import React, { Suspense, useCallback } from "react";
import { each, filter, find, get, has, isEmpty, isNull, isString, memoize, omit } from "lodash-es";
import { twMerge } from "tailwind-merge";
import { ChaiBlock } from "../../../types/ChaiBlock";
import { SLOT_KEY, STYLES_KEY } from "../../../constants/STRINGS.ts";
import { getBlockComponent } from "@chaibuilder/runtime";
import { useChaiExternalData } from "./useChaiExternalData.ts";
import { useAtom } from "jotai";
import { inlineEditingActiveAtom, xShowBlocksAtom } from "../../../atoms/ui.ts";
import { useBlocksStore } from "../../../history/useBlocksStoreUndoableActions.ts";
import { useCanvasSettings } from "../../../hooks/useCanvasSettings.ts";
import { draggedBlockAtom, dropTargetAtom } from "../dnd/atoms.ts";
import { canAcceptChildBlock } from "../../../functions/block-helpers.ts";
import { useCanvasWidth } from "../../../hooks";
import { includes } from "lodash";
import { isVisibleAtBreakpoint } from "../../../functions/isVisibleAtBreakpoint.ts";

// FIXME:  Duplicate code in CanvasRenderer.tsx
const getSlots = (block: ChaiBlock) => {
  // loop over all keys and find the ones that start with slot
  const slots: { [key: string]: string[] } = {};
  Object.keys(block).forEach((key) => {
    if (isString(block[key]) && block[key].startsWith(SLOT_KEY)) {
      slots[key] = block[key].replace(SLOT_KEY, "").split(",");
    }
  });
  return slots;
};

const generateClassNames = memoize((styles: string) => {
  const stylesArray = styles.replace(STYLES_KEY, "").split(",");
  return twMerge(stylesArray[0], stylesArray[1]);
});

function getElementAttrs(block: ChaiBlock, key: string) {
  return get(block, `${key}_attrs`, {}) as Record<string, string>;
}

function getStyleAttrs(block: ChaiBlock, breakpoint: any) {
  const styles: Record<string, any> = {};
  Object.keys(block).forEach((key) => {
    if (isString(block[key]) && block[key].startsWith(STYLES_KEY)) {
      const className = generateClassNames(block[key]);
      const attrs = getElementAttrs(block, key);
      styles[key] = {
        className,
        "data-style-prop": key,
        "data-block-parent": block._id,
        "data-style-id": `${key}-${block._id}`,
        ...attrs,
      };
      const alpineAttrs = has(attrs, "x-show") || has(attrs, "x-if");
      if (alpineAttrs) {
        styles["__isHidden"] = alpineAttrs && !isVisibleAtBreakpoint(className, breakpoint);
      }
    }
  });
  return styles;
}

function applyBindings(block: ChaiBlock, chaiData: any): ChaiBlock {
  const bindings = get(block, "_bindings", {});
  if (isEmpty(bindings)) return { ...block };
  each(bindings, (value, key) => {
    if (isString(value) && get(chaiData, value, null)) {
      block[key] = get(chaiData, value, null);
    }
  });
  return block;
}

export function BlocksRendererStatic({ blocks }: { blocks: ChaiBlock[] }) {
  const [allBlocks] = useBlocksStore();
  const [xShowBlocks] = useAtom(xShowBlocksAtom);
  const [draggedBlock] = useAtom(draggedBlockAtom);
  const [dropTargetId] = useAtom(dropTargetAtom);
  const [, breakpoint] = useCanvasWidth();
  const [canvasSettings] = useCanvasSettings();
  const getStyles = useCallback((block: ChaiBlock) => getStyleAttrs(block, breakpoint), [breakpoint]);

  const [chaiData] = useChaiExternalData();
  const [editingBlockId] = useAtom(inlineEditingActiveAtom);
  const getCanvasSettings = useCallback(
    (blockIds: string[]) => {
      return blockIds.reduce((acc, blockId) => {
        const settings = get(canvasSettings, blockId, {});
        return { ...acc, ...settings };
      }, {});
    },
    [canvasSettings, allBlocks],
  );

  return (
    <>
      {React.Children.toArray(
        blocks.map((block: ChaiBlock, index: number) => {
          // If the block is being edited, we don't want to render it
          if (editingBlockId === block._id) return null;

          const slots = getSlots(block);
          const attrs: any = {};
          if (!isEmpty(slots)) {
            Object.keys(slots).forEach((key) => {
              attrs[key] = React.Children.toArray(
                slots[key].map((slotId: string) => (
                  <BlocksRendererStatic blocks={[find(allBlocks, { _id: slotId }) as ChaiBlock]} />
                )),
              );
            });
          }
          const childBlocks = filter(allBlocks, { _parent: block._id });
          attrs.children = childBlocks.length ? <BlocksRendererStatic blocks={childBlocks} /> : null;

          const chaiBlock = getBlockComponent(block._type) as any;
          const Component = get(chaiBlock, "builderComponent", get(chaiBlock, "component", null));
          if (isNull(Component)) return <noscript>{`<!-- ${block?._type} not registered -->`}</noscript>;
          const blockStateFrom = has(chaiBlock, "getBlockStateFrom")
            ? chaiBlock?.getBlockStateFrom(block, allBlocks)
            : [];
          const blockState = getCanvasSettings(blockStateFrom);
          const htmlAttrs = getStyles(block);
          if (get(htmlAttrs, "__isHidden", false) && !includes(xShowBlocks, block._id)) {
            return null;
          }
          return (
            <Suspense>
              {React.createElement(Component, {
                blockProps: {
                  ...(includes(xShowBlocks, block._id) ? { "force-show": "" } : {}),
                  "data-block-id": block._id,
                  "data-block-type": block._type,
                  ...(draggedBlock
                    ? // @ts-ignore
                      {
                        "data-dnd": canAcceptChildBlock(block._type, (draggedBlock as ChaiBlock)?._type) ? "yes" : "no",
                        "data-dnd-dragged": (draggedBlock as ChaiBlock)._id === block._id ? "yes" : "no",
                      }
                    : {}),
                  ...(dropTargetId === block._id ? { "data-drop": "yes" } : {}),
                },
                index,
                ...applyBindings(block, chaiData),
                ...omit(htmlAttrs, ["__isHidden"]),
                ...attrs,
                inBuilder: true,
                blockState,
              })}
            </Suspense>
          );
        }),
      )}
    </>
  );
}
