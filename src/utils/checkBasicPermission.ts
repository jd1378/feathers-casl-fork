import {
  setPersistedConfig,
  checkMulti,
  getAbility,
  throwUnlessCan,
} from "../hooks/authorize/authorize.hook.utils";

import { checkCreatePerItem, makeDefaultBaseOptions } from "../hooks/common";

import type { HookContext } from "@feathersjs/feathers";
import _isEmpty from "lodash/isEmpty.js";

import type {
  CheckBasicPermissionUtilsOptions,
  CheckBasicPermissionHookOptionsExclusive,
} from "../types";
import { getMethodName } from "./getMethodName";
import { subject } from "@casl/ability";

const defaultOptions: CheckBasicPermissionHookOptionsExclusive = {
  checkCreateForData: false,
  storeAbilityForAuthorize: false,
  idField: "id",
};

const makeOptions = (
  options?: Partial<CheckBasicPermissionUtilsOptions>
): CheckBasicPermissionUtilsOptions => {
  options = options || {};
  return Object.assign(makeDefaultBaseOptions(), defaultOptions, options);
};

export const checkBasicPermissionUtil = async <H extends HookContext>(
  context: H,
  _options?: Partial<CheckBasicPermissionUtilsOptions>
): Promise<H> => {
  let options = makeOptions(_options);

  const method = getMethodName(context, options);

  options = {
    ...options,
    method,
  };

  if (!options.modelName) {
    return context;
  }

  const modelName =
    typeof options.modelName === "string"
      ? options.modelName
      : options.modelName(context);

  if (!modelName) {
    return context;
  }

  const ability = await getAbility(context, options);
  if (!ability) {
    // Ignore internal or not authenticated requests
    return context;
  }

  if (options.checkMultiActions) {
    checkMulti(context, ability, modelName, options);
  }

  const idField =
    typeof options.idField === "function"
      ? options.idField(context)
      : options.idField;

  let obj;
  if (context.id) {
    obj = subject(modelName, { [idField]: context.id });
  } else if (!_isEmpty(context.params?.query)) {
    obj = subject(modelName, context.params.query);
  } else if (context.data) {
    obj = subject(modelName, context.data);
  } else {
    obj = modelName;
  }

  throwUnlessCan(ability, method, obj, modelName, options);

  checkCreatePerItem(context, ability, modelName, options);

  if (options.storeAbilityForAuthorize) {
    setPersistedConfig(context, "ability", ability);
  }

  setPersistedConfig(context, "madeBasicCheck", true);

  return context;
};
