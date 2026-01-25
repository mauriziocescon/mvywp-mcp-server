# General concepts

At frontend level, the task detail screen is made by several "cells" called blocks. Here is an example:

In general, a block is any ng-component encapsulating some reusable logic that can be instantiated programmatically in a dynamic way.
Blocks represent visual components that can be either of predefined `known` type, like `infoHeader`, `tabs`, `nextStep` etc. or represent components custom developed by business process developers.
Such custom developed blocks can act as independent participants having their own micro-service backend and through that they can communicate with the task container (affecting the validity of a task, the selected outcome, ...).
Any sort of communication between blocks at ui level is not allowed. Some participant micro-services are already provided like `actionList`, `documentList`, and `internalCommunication`.

Blocks for a specific task are configured in the TaskConfiguration.json matching the task definition metadata. Below you can see an example for the task-detail of the screenshot: each block carries a type and (typically) some optional configuration items, depending on the block type.

```json
{
  "blockList": [
    {
      "type": "tabs",
      "config": {
        "preselectedTabId": "overview",
        "tabs": [
          {
            "id": "overview",
            "label": "Overview",
            "blocks": [
              {
                "type": "nextStep",
                "config": {
                  ...
                }
              },
              {
                "type": "form",
                "validityCheckRequired": true,
                "config": {
                  "replaceBlockIdWithParticipantId": true
                }
              },
              {
                "type": "taskAction",
                "config": {
                }
              }
            ]
          },
          {
            "id": "documents",
            "label": "Documents",
            "blocks": [
              {
                "type": "documentList",
                "config": {}
              }
            ]
          },
          {
            "id": "internal_communication",
            "label": "Internal communication",
            "blocks": [
              {
                "type": "internalCommunication",
                "config": {
                }
              }
            ]
          },
          {
            "id": "consultation",
            "label": "Consultation",
            "blocks": [
              {
                "type": "consultation",
                "config": {
                  ...
                }
              }
            ]
          }
        ]
      }
    },
    {
      "type": "clock",
      "config": {
        ...
      }
    },
    {
      "type": "infoHeader",
      "config": {
        ...
      }
    }
  ]
}
```

In terms of layout, business developers can customize the content of the header block, not its position on the page. On the other hand, the tabs block is fully customisable meaning that the number of tabs, content of each one, labels, the pre-selected one (at loading time) are all configurable.

When task-detail loads, the task-model and blocks-configuration are fetched. The type of each block (from configuration) is used to dynamically create all the ng-components. Each block object is injected as an ng-input on every component.

The typescript interface of a block (or block-config) is defined and exported inside the cc-shared-ui package:

```ts
/**
 * A block is an object that identifies
 * a generic ng-component in a cc-section.
 *
 * It is typically used to instantiate
 * ng-components programmatically and dynamically
 * like in {@link GenericBlockComponent}.
 *
 * In general, it can be also used to identified
 * a reusable component by id (like taxonomy).
 */
export interface Block {
  /**
   * Id of the block: if defined, must be uuid.
   */
  id?: string;
  /**
   * Type of block which is associated
   * to a particular ng-component. It's
   * mandatory in in
   * {@link GenericBlockComponent}.
   */
  type?: string;
}


export interface BlockConfig extends Block {
  /**
   * Extra configuration related to the block
   */
  config?: { [key: string]: any };
}
```

Blocks that are participants (shortly participant-blocks) are enriched at container level (task detail) with extra relevant information, in particular the participantId, containerId and task variables. The generic typescript interface of a participant block(that can be extended based on business needs) is defined and exported in the cc-shared-ui package:

```ts
import { Block } from './block.model';

/**
 * Definition of a block for ng-components that
 * are linked to a specific microservice
 *
 * These kind of blocks can be defined by
 * business teams
 */
export interface ParticipantBlock extends Block {
  /**
   * participantId: must be uuid
   * and it is always defined.
   */
  id: string;
  /**
   * Participant info (mostly related to
   * ReadOnlyMode, Validation, Snapshot)
   */
  participant: Participant;
  /**
   * Reference to the container the participant is used.
   * TaskDetail: taskInstanceId,
   * ProcessCenter: processInstanceId,
   * Portfolio: portfolioItemId
   */
  containerId: string;
  /**
   * Variables related to the particular
   * context (TaskDetail - ProcessCenter - Portfolio)
   * the participant is used.
   */
  containerVariables: { [key: string]: any };
  /**
   * Indicates that the container
   * is reffering to a particular
   * snapshot.
   */
  containerSnapshotId?: string;
}

export interface Participant {
  /**
   * ParticipantId (uuid) which can be
   * used to retrieve info for any particular
   * participant
   */
  id: string;
  /**
   * Type of participant which is associated
   * to a particular angular component
   */
  type: string;
  /**
   * Qualifier in case of participants
   * of the same type (irrelevant ui side).
   */
  qualifier: string;
  /**
   * State of the participant (task-detail validation
   * mechanism)
   */
  valid: boolean;
  /**
   * If the participant is visible
   * or not at ui level.
   */
  enabled: boolean;
  /**
   * ContainerId that has created the participant
   */
  createdByContainerId: string;
  /**
   * If the participant is in editable mode
   * or not
   */
  readonly: boolean;
  /**
   * If the participant plays an active
   * role in the validation or not
   */
  validityCheckRequired: boolean;
  /**
   *
   */
  containerAware: boolean;
  /**
   * Indicates that the participant
   * info should be retrieved based
   * on a particular snapshot.
   */
  snapshotId?: string;
}
```

# Integration of participants in mywp

At complete guide on "how to develop and deliver a participant" in mywp is available here.
