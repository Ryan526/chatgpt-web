<script lang="ts">
  import {
    saveChatStore,
    chatsStorage,
    addMessage,
    updateChatSettings,
    checkStateChange,
    showSetChatSettings,
    submitExitingPromptsNow,
    continueMessage,
    getMessage,
    currentChatMessages,
    setCurrentChat,
    currentChatId
  } from './Storage.svelte'
  import {
    type Message,
    type Chat
  } from './Types.svelte'
  import Prompts from './Prompts.svelte'
  import Messages from './Messages.svelte'
  import { restartProfile } from './Profiles.svelte'
  import { afterUpdate, onMount, onDestroy } from 'svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import {
    faArrowUpFromBracket,
    faPaperPlane,
    faGear,
    faPenToSquare,
    faMicrophone,
    faLightbulb,
    faCommentSlash,
    faCircleCheck,
    faPaperclip
  } from '@fortawesome/free-solid-svg-icons/index'
  import { v4 as uuidv4 } from 'uuid'
  import { getPrice } from './Stats.svelte'
  import { autoGrowInputOnEvent, scrollToBottom, sizeTextElements } from './Util.svelte'
  import ChatSettingsModal from './ChatSettingsModal.svelte'
  import Footer from './Footer.svelte'
  import { openModal } from 'svelte-modals'
  import PromptInput from './PromptInput.svelte'
  import { ChatRequest } from './ChatRequest.svelte'
  import { getModelDetail } from './Models.svelte'
  import { addUserUploadedImage } from './ImageStore.svelte';

  export let params = { chatId: '' }
  const chatId: number = parseInt(params.chatId)

  let chatRequest = new ChatRequest()
  let input: HTMLTextAreaElement
  let fileInput: HTMLInputElement
  let recognition: any = null
  let recording = false
  let lastSubmitRecorded = false

  let selectedImageBase64: string | null = null;
  let selectedImageName: string | null = null;
  let isDragging = false;

  $: chat = $chatsStorage.find((chat) => chat.id === chatId) as Chat
  $: chatSettings = chat?.settings
  let showSettingsModal

  const handleImageSelection = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target?.files?.[0];

    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          selectedImageBase64 = e.target?.result as string;
          selectedImageName = file.name;
        };
        reader.readAsDataURL(file);
      } else {
        console.warn('Invalid file type. Please select an image.');
        // Optionally, display a user-facing notice here
      }
    }
    // Reset file input to allow selecting the same file again
    if (target) {
      target.value = '';
    }
  };

  const removeSelectedImage = () => {
    selectedImageBase64 = null;
    selectedImageName = null;
  };

  let scDelay
  const onStateChange = async (...args:any) => {
    if (!chat) return
    clearTimeout(scDelay)
    setTimeout(async () => {
      if (chat.startSession) {
        await restartProfile(chatId)
        if (chat.startSession) {
          chat.startSession = false
          saveChatStore()
          // Auto start the session
          submitForm(false, true)
        }
      }
      if ($showSetChatSettings) {
        $showSetChatSettings = false
        showSettingsModal()
      }
      if ($submitExitingPromptsNow) {
        $submitExitingPromptsNow = false
        submitForm(false, true)
      }
      if ($continueMessage) {
        const message = getMessage(chatId, $continueMessage)
        $continueMessage = ''
        if (message && $currentChatMessages.indexOf(message) === ($currentChatMessages.length - 1)) {
          submitForm(lastSubmitRecorded, true, message)
        }
      }
    })
  }
  
  $: onStateChange($checkStateChange, $showSetChatSettings, $submitExitingPromptsNow, $continueMessage)

  const afterChatLoad = (...args:any) => {
    scrollToBottom()
  }

  $: afterChatLoad($currentChatId)

  setCurrentChat(0)
  // Make sure chat object is ready to go
  updateChatSettings(chatId)

  onDestroy(async () => {
    // clean up
    // abort any pending requests.
    chatRequest.controller.abort()
    ttsStop()
  })

  onMount(async () => {
    if (!chat) return

    setCurrentChat(chatId)

    chatRequest = new ChatRequest()
    await chatRequest.setChat(chat)

    chat.lastAccess = Date.now()
    saveChatStore()
    $checkStateChange++

    // Focus the input on mount
    focusInput()

    // Try to detect speech recognition support
    if ('SpeechRecognition' in window) {
      // @ts-ignore
      recognition = new window.SpeechRecognition()
    } else if ('webkitSpeechRecognition' in window) {
      // @ts-ignore
      recognition = new window.webkitSpeechRecognition() // eslint-disable-line new-cap
    }

    if (recognition) {
      recognition.interimResults = false
      recognition.onstart = () => {
        recording = true
      }
      recognition.onresult = (event) => {
        // Stop speech recognition, submit the form and remove the pulse
        const last = event.results.length - 1
        const text = event.results[last][0].transcript
        input.value = text
        recognition.stop()
        recording = false
        submitForm(true)
      }
    } else {
      console.log('Speech recognition not supported')
    }
    if (chat.startSession) {
      await restartProfile(chatId)
      if (chat.startSession) {
        chat.startSession = false
        saveChatStore()
        // Auto start the session
        setTimeout(() => { submitForm(false, true) }, 0)
      }
    }
  })

  // Scroll to the bottom of the chat on update
  afterUpdate(() => {
    sizeTextElements()
    // Scroll to the bottom of the page after any updates to the messages array
    // focusInput()
  })

  // Scroll to the bottom of the chat on update
  const focusInput = () => {
    input.focus()
    scrollToBottom()
  }

  const addNewMessage = async () => {
    if (chatRequest.updating) return;
    let messageContent = input.value;
    let imagePreviewPayload: { imagePreviewUrl?: string } = {};
    let imageStorePayload: { image?: { id: string } } = {};

    if (selectedImageBase64) {
      imagePreviewPayload = { imagePreviewUrl: selectedImageBase64 };
      if (!messageContent.trim() && selectedImageName) {
        messageContent = `Image: ${selectedImageName}`;
      }
      // Store the image and get its ID
      const storedImageInfo = await addUserUploadedImage(chatId, selectedImageBase64);
      if (storedImageInfo && storedImageInfo.id) {
        imageStorePayload = { image: { id: storedImageInfo.id } };
      }
    }

    if (!messageContent.trim() && !selectedImageBase64) {
      // Do not add an empty message if there's no text and no image
      return;
    }
    
    let inputMessage: Message;
    const lastMessage = $currentChatMessages[$currentChatMessages.length - 1];
    const uuid = uuidv4();

    const commonMessageProps = {
      content: messageContent,
      uuid,
      ...imagePreviewPayload,
      ...imageStorePayload
    };

    if ($currentChatMessages.length === 0) {
      inputMessage = { role: 'system', ...commonMessageProps };
    } else if (lastMessage && lastMessage.role === 'user') {
      inputMessage = { role: 'assistant', ...commonMessageProps };
    } else {
      inputMessage = { role: 'user', ...commonMessageProps };
    }
    addMessage(chatId, inputMessage);

    // Clear the input value and selected image
    input.value = '';
    removeSelectedImage(); 
    focusInput();
  };

  const ttsStart = (text:string, recorded:boolean) => {
    // Use TTS to read the response, if query was recorded
    if (recorded && 'SpeechSynthesisUtterance' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      window.speechSynthesis.speak(utterance)
    }
  }

  const ttsStop = () => {
    if ('SpeechSynthesisUtterance' in window) {
      window.speechSynthesis.cancel()
    }
  }

  let waitingForCancel:any = 0

  const cancelRequest = () => {
    if (!waitingForCancel) {
      // wait a second for another click to avoid accidental cancel
      waitingForCancel = setTimeout(() => { waitingForCancel = 0 }, 1000)
      return
    }
    clearTimeout(waitingForCancel); waitingForCancel = 0
    chatRequest.controller.abort()
  }

  const submitForm = async (recorded: boolean = false, skipInput: boolean = false, fillMessage: Message|undefined = undefined): Promise<void> => {
    // Compose the system prompt message if there are no messages yet - disabled for now
    if (chatRequest.updating) return

    lastSubmitRecorded = recorded
  
    if (!skipInput) {
      chat.sessionStarted = true
      saveChatStore()
      
      let messageContent = input.value;
      let imagePreviewPayload: { imagePreviewUrl?: string } = {};
      let imageStorePayload: { image?: { id: string } } = {};

      if (selectedImageBase64) {
        imagePreviewPayload = { imagePreviewUrl: selectedImageBase64 };
        if (!messageContent.trim() && selectedImageName) {
          messageContent = `Image: ${selectedImageName}`; 
        }
        // Store the image and get its ID
        const storedImageInfo = await addUserUploadedImage(chatId, selectedImageBase64);
        if (storedImageInfo && storedImageInfo.id) {
          imageStorePayload = { image: { id: storedImageInfo.id } };
        }
      }

      if (messageContent.trim() || selectedImageBase64) { // Ensure message is added if only image is present
        const inputMessage: Message = { 
          role: 'user', 
          content: messageContent, 
          uuid: uuidv4(),
          ...imagePreviewPayload,
          ...imageStorePayload 
        };
        addMessage(chatId, inputMessage);
      } else if (!fillMessage && $currentChatMessages.length &&
        $currentChatMessages[$currentChatMessages.length - 1].role === 'assistant') {
        fillMessage = $currentChatMessages[$currentChatMessages.length - 1];
      }
  
      // Clear the input value and selected image
      input.value = '';
      removeSelectedImage();
      input.blur();
  
      // Resize back to single line height
      input.style.height = 'auto';
    }
    focusInput();

    chatRequest.updating = true;
    chatRequest.updatingMessage = ''

    let doScroll = true
    let didScroll = false

    const checkUserScroll = (e: Event) => {
      const el = e.target as HTMLElement
      if (el && e.isTrusted && didScroll) {
        // from user
        doScroll = (window.innerHeight + window.scrollY + 10) >= document.body.offsetHeight
      }
    }

    window.addEventListener('scroll', checkUserScroll)

    try {
      const response = await chatRequest.sendRequest($currentChatMessages, {
        chat,
        autoAddMessages: true, // Auto-add and update messages in array
        streaming: chatSettings.stream,
        fillMessage,
        imageBase64: selectedImageBase64 || null,
        onMessageChange: (messages) => {
          if (doScroll) scrollToBottom(true)
          didScroll = !!messages[0]?.content
        }
      })
      await response.promiseToFinish()
      const message = response.getMessages()[0]
      if (message) {
        ttsStart(message.content, recorded)
      }
    } catch (e) {
      console.error(e)
    }
  
    window.removeEventListener('scroll', checkUserScroll)

    chatRequest.updating = false
    chatRequest.updatingMessage = ''

    focusInput()
  }

  const suggestName = async (): Promise<void> => {
    const suggestMessage: Message = {
      role: 'user',
      content: "Using appropriate language, please tell me a short 6 word summary of this conversation's topic for use as a book title. Only respond with the summary.",
      uuid: uuidv4()
    }

    const suggestMessages = $currentChatMessages.slice(0, 10) // limit to first 10 messages
    suggestMessages.push(suggestMessage)

    chatRequest.updating = true
    chatRequest.updatingMessage = 'Getting suggestion for chat name...'
    const response = await chatRequest.sendRequest(suggestMessages, {
      chat,
      autoAddMessages: false,
      streaming: false,
      summaryRequest: true
    })

    try {
      await response.promiseToFinish()
    } catch (e) {
      console.error('Error generating name suggestion', e, e.stack)
    }
    chatRequest.updating = false
    chatRequest.updatingMessage = ''
    if (response.hasError()) {
      addMessage(chatId, {
        role: 'error',
        content: `Unable to get suggested name: ${response.getError()}`,
        uuid: uuidv4()
      })
    } else {
      response.getMessages().forEach(m => {
        const name = m.content.split(/\s+/).slice(0, 8).join(' ').replace(/^[^a-z0-9!?]+|[^a-z0-9!?]+$/gi, '').trim()
        if (name) chat.name = name
      })
      saveChatStore()
    }
  }

  function promptRename () {
    openModal(PromptInput, {
      title: 'Enter Name for Chat',
      label: 'Name',
      value: chat.name,
      class: 'is-info',
      onSubmit: (value) => {
        chat.name = (value || '').trim() || chat.name
        saveChatStore()
        $checkStateChange++
      }
    })
  }

  const recordToggle = () => {
    ttsStop()
    if (chatRequest.updating) return
    // Check if already recording - if so, stop - else start
    if (recording) {
      recognition?.stop()
      recording = false
    } else {
      recognition?.start()
    }
  }

</script>
{#if chat}
<ChatSettingsModal chatId={chatId} bind:show={showSettingsModal} />
<div class="chat-page" style="--running-totals: {Object.entries(chat.usage || {}).length}">
<div class="chat-content">
<nav class="level chat-header">
  <div class="level-left">
    <div class="level-item">
      <p class="subtitle is-5">
        <span>{chat.name || `Chat ${chat.id}`}</span>
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Rename chat" on:click|preventDefault={promptRename}><Fa icon={faPenToSquare} /></a>
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Suggest a chat name" on:click|preventDefault={suggestName}><Fa icon={faLightbulb} /></a>
        <!-- <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Copy this chat" on:click|preventDefault={() => { copyChat(chatId) }}><Fa icon={faClone} /></a> -->
        <!-- <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Delete this chat" on:click|preventDefault={deleteChat}><Fa icon={faTrash} /></a> -->
      </p>
    </div>
  </div>

  <div class="level-right">
    <div class="level-item">
      <!-- <button class="button is-warning" on:click={() => { clearMessages(chatId); window.location.reload() }}><span class="greyscale mr-2"><Fa icon={faTrash} /></span> Clear messages</button> -->
    </div>
  </div>
</nav>

<Messages messages={$currentChatMessages} chatId={chatId} chat={chat} />

{#if chatRequest.updating === true || $currentChatId === 0}
  <article class="message is-success assistant-message">
    <div class="message-body content">
      <span class="is-loading" ></span>
      <span>{chatRequest.updatingMessage}</span>
    </div>
  </article>
{/if}

{#if $currentChatId !== 0 && ($currentChatMessages.length === 0 || ($currentChatMessages.length === 1 && $currentChatMessages[0].role === 'system'))}
  <Prompts bind:input />
{/if}
</div>
<Footer class="prompt-input-container" strongMask={true}>
  <form class="field has-addons has-addons-right is-align-items-flex-end" on:submit|preventDefault={() => submitForm()}>
    <div class="control is-expanded">
      {#if selectedImageBase64}
        <div class="selected-image-preview field has-addons">
          <div class="control">
            <img src={selectedImageBase64} alt="Preview" style="max-width: 50px; max-height: 50px; margin-right: 5px;" />
          </div>
          <div class="control is-expanded">
            <span class="is-size-7">{selectedImageName}</span>
          </div>
          <div class="control">
            <button type="button" class="delete is-small" on:click={removeSelectedImage} title="Remove image"></button>
          </div>
        </div>
      {/if}
      <textarea
        class="input is-info is-focused chat-input auto-size"
        class:drag-over={isDragging}
        placeholder="[{chat.settings.model}] Type your message here or drag and drop an image..."
        rows="1"
        on:keydown={e => {
          // Only send if Enter is pressed, not Shift+Enter
          if (e.key === 'Enter' && !e.shiftKey) {
            e.stopPropagation()
            submitForm()
            e.preventDefault()
          }
        }}
        on:input={e => autoGrowInputOnEvent(e)}
        bind:this={input}
        on:dragover={e => {
          e.preventDefault();
          isDragging = true;
        }}
        on:dragleave={() => {
          isDragging = false;
        }}
        on:drop={e => {
          e.preventDefault();
          isDragging = false;
          handleImageSelection(e);
        }}
      />
    </div>
    <p class="control">
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        style="display: none;"
        on:change={handleImageSelection}
      />
      <button
        class="button"
        type="button"
        title="Attach image"
        on:click={() => fileInput?.click()}
      >
        <Fa icon={faPaperclip} />
      </button>
    </p>
    <p class="control mic" class:is-hidden={!recognition}>
      <button class="button" class:is-disabled={chatRequest.updating} class:is-pulse={recording} on:click|preventDefault={recordToggle}
        ><span class="icon"><Fa icon={faMicrophone} /></span></button
      >
    </p>
    <p class="control settings">
      <button title="Chat/Profile Settings" class="button" on:click|preventDefault={showSettingsModal}><span class="icon"><Fa icon={faGear} /></span></button>
    </p>
    <p class="control queue">
      <button title="Queue message, don't send yet" class:is-disabled={chatRequest.updating} class="button is-ghost" on:click|preventDefault={addNewMessage}><span class="icon"><Fa icon={faArrowUpFromBracket} /></span></button>
    </p>
    {#if chatRequest.updating}
    <p class="control send">
      <button title="Cancel Response" class="button is-danger" type="button" on:click={cancelRequest}><span class="icon">
        {#if waitingForCancel}
        <Fa icon={faCircleCheck} />
        {:else}
        <Fa icon={faCommentSlash} />
        {/if}
      </span></button>
    </p>
    {:else}
    <p class="control send">
      <button title="Send" class="button is-info" type="submit"><span class="icon"><Fa icon={faPaperPlane} /></span></button>
    </p>
    {/if}
  </form>
  <div class="content has-text-centered running-total-container">
    {#each Object.entries(chat.usage || {}) as [model, usage]}
    <p class="is-size-7 running-totals">
      <em>{getModelDetail(model || '').label || model}</em> total <span class="has-text-weight-bold">{usage.total_tokens}</span>
      tokens ~= <span class="has-text-weight-bold">${getPrice(usage, model).toFixed(6)}</span>
    </p>
    {/each}
  </div>
</Footer>
</div>
{/if}