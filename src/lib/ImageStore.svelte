<script context="module" lang="ts">
  import Dexie, { type Table } from 'dexie'
  import type { ChatImage } from './Types.svelte'
  import { v4 as uuidv4 } from 'uuid'

  let _hasIndexedDb = !!window.indexedDB
  const dbCheck = _hasIndexedDb && window.indexedDB.open('test')
  if (_hasIndexedDb) dbCheck.onerror = () => { _hasIndexedDb = false }
  
  let imageCache: Record<string, ChatImage> = {}

  class ChatImageStore extends Dexie {
    images!: Table<ChatImage>
    constructor () {
      super('chatImageStore')
      this.version(1).stores({
        images: 'id' // Primary key and indexed props
      })
    }
  }

  const imageDb = new ChatImageStore()

  export const hasIndexedDb = () => _hasIndexedDb

  export const getImage = async (uuid:string): Promise<ChatImage> => {
    let image = imageCache[uuid]
    if (image || !_hasIndexedDb) return image
    image = await imageDb.images.get(uuid) as any
    imageCache[uuid] = image
    return image
  }

  export const deleteImage = async (chatId:number, uuid:string): Promise<void> => {
    const cached = imageCache[uuid]
    if (cached) cached.chats = cached.chats?.filter(c => c !== chatId)
    if (!cached?.chats?.length) delete imageCache[uuid]
    if (_hasIndexedDb) {
      const stored:ChatImage = await imageDb.images.get({ id: uuid }) as any
      if (stored) stored.chats = stored.chats?.filter(c => c !== chatId)
      if (!stored?.chats?.length) {
        imageDb.images.delete(uuid)
      } else if (stored) {
        await setImage(chatId, stored)
      }
    }
  }

  export const clearAllImages = async (): Promise<void> => {
    imageCache = {}
    if (_hasIndexedDb) {
      imageDb.images.clear()
    }
  }

  export const setImage = async (chatId:number, image:ChatImage): Promise<ChatImage> => {
    image.id = image.id || uuidv4()
    let current: ChatImage
    if (_hasIndexedDb) {
      current = await imageDb.images.get({ id: image.id }) as any
    } else {
      current = imageCache[image.id]
    }
    current = current || image
    current.chats = current.chats || []
    if (!(chatId in current.chats)) current.chats.push(chatId)
    imageCache[current.id] = current
    if (_hasIndexedDb) {
      imageDb.images.put(current, current.id)
    }
    const clone = JSON.parse(JSON.stringify(current))
    // Return a copy without the payload so local storage doesn't get clobbered
    delete clone.b64image
    delete clone.chats
    return clone
  }

  export const addUserUploadedImage = async (chatId: number, base64ImageDataUrl: string): Promise<ChatImage | null> => {
    if (!base64ImageDataUrl) {
      return null;
    }

    const base64Prefix = /^data:image\/[a-z]+;base64,/;
    const extractedBase64Content = base64ImageDataUrl.replace(base64Prefix, '');
    const generatedId = uuidv4();

    const newImage: ChatImage = {
      id: generatedId,
      b64image: extractedBase64Content,
      chats: [chatId],
      // created: Date.now() // Optional: Add timestamp if needed in ChatImage type
    };

    if (_hasIndexedDb) {
      try {
        await imageDb.images.put(newImage, newImage.id);
      } catch (error) {
        console.error("Failed to store image in IndexedDB:", error);
        // Fallback or alternative handling if IndexedDB fails, though not the primary path
        // For now, we'll just log the error. If imageCache is to be used as a fallback:
        // imageCache[newImage.id] = newImage; 
      }
    } else {
      // Handle the case where IndexedDB is not available
      // For example, store in memory (though this won't persist across sessions)
      console.warn("IndexedDB not available. Image not persistently stored.");
      // imageCache[newImage.id] = newImage; // Optional: cache in memory
      return null; // Or handle differently if non-persistent storage is acceptable
    }
    
    // Return a "cleaned" version of the image object
    return {
      id: newImage.id,
      // chats: newImage.chats, // Only include if needed by the caller immediately
      // b64image: '', // Explicitly ensure it's not returned
    } as ChatImage; // Cast to ChatImage, acknowledging b64image is missing
  };

</script>