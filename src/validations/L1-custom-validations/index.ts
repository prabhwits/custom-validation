import {
  search,
  onSearch,
  select,
  onSelect,
  init,
  onInit,
  confirm,
  onConfirm,
  onStatusRouter,
} from "../L1-custom-validations/apiTests/index";
import { validationOutput } from "./types";

export async function performL1CustomValidations(
  payload: any,
  action: string,
  allErrors = false,
  externalData = {}
): Promise<validationOutput> {
  console.log("Performing custom L1 validations for action: " + action);
  let result: any = [];
  switch (action) {
    case "search":
      result = await search(payload);
      break;
    case "on_search":
      result = await onSearch(payload);
      break;
    case "select":
      result = await select(payload);
      break;
    case "on_select":
      result = await onSelect(payload);
      break;
    case "init":
      result = await init(payload);
      break;
    case "on_init":
      result = await onInit(payload);
      break;
    case "confirm":
      result = await confirm(payload);
      break;
    case "on_confirm":
      result = await onConfirm(payload);
      break;
    case "on_status":
      result = await onStatusRouter(payload);

    default:
      result = [
        {
          valid: false,
          code: 403,
          description: "Not a valid action call", // description is optional
        },
      ];

      break;
  }
  console.log("resulttttt", result);
  return [...result];
  return [
    {
      valid: true,
      code: 200,
      description: "Custom validation passed", // description is optional
    },
  ];
}
