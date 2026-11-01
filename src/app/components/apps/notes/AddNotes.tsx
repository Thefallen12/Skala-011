'use client'

import { useState } from 'react'
import { DialogFooter } from '@/components/ui/dialog'
import { GlobalModal } from '@/components/ui/global-modal'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { TbCheck } from 'react-icons/tb'

interface Color {
  disp: string
}

interface Props {
  colors: Color[]
  addNote: (note: { title: string; color: string }) => Promise<boolean>
}

const colorClassMap: Record<string, string> = {
  primary: 'bg-lightprimary',
  warning: 'bg-lightwarning',
  error: 'bg-lighterror',
  success: 'bg-lightsuccess',
  secondary: 'bg-lightsecondary',
}

const AddNotes = ({ colors, addNote }: Props) => {
  const [openNoteModal, setOpenNoteModal] = useState(false)
  const [scolor, setScolor] = useState<string>('primary')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const setColor = (e: string) => setScolor(e)

  const handleSave = async () => {
    setSaving(true)
    try {
      if (await addNote({ title: title.trim(), color: scolor })) {
        setOpenNoteModal(false)
        setTitle('')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button className='rounded-md' onClick={() => setOpenNoteModal(true)}>Add Note</Button>
      <GlobalModal
        isOpen={openNoteModal}
        onClose={() => setOpenNoteModal(false)}
        title='Add New Note'
        className='sm:max-w-lg'
      >
          <div className='space-y-2'>
            <Textarea
              rows={5}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='w-full'
              placeholder='Write your note here...'
            />
            <h6 className='text-base pt-4'>Change Note Color</h6>
            <div className='flex gap-2 items-center'>
              {colors?.map((color) => (
                <div
                  key={color.disp}
                  onClick={() => setColor(color.disp)}
                  className={`h-7 w-7 flex justify-center items-center rounded-full cursor-pointer ${colorClassMap[color.disp] ?? colorClassMap.primary}`}>
                  {scolor === color.disp && (
                    <TbCheck size={18} className='text-white' />
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className='pt-4'>
            <Button
              disabled={!title.trim() || saving}
              onClick={() => void handleSave()}
              className='rounded-md'>
              Save
            </Button>
            <Button
              variant='outline'
              className='rounded-md'
              onClick={() => setOpenNoteModal(false)}>
              Close
            </Button>
          </DialogFooter>
      </GlobalModal>
    </>
  )
}

export default AddNotes
